---
theme: default
title: Building a fast log with a smidge of fault-tolerance
info: |
  Distributed logs sit at the heart of many complex distributed systems, but you
  don't need to be building a database to use one yourself. They are a powerful
  tool for building reliable, stateful software. At Jane Street, we wanted to
  make this style of programming more accessible to everyone, so we set out
  using what we knew from low-latency exchange architecture to build and run a
  general-purpose distributed log that others could build on top of. And thus
  Aria was born.

  In this talk, we'll look at the architecture and design choices that make Aria
  what it is -- and how far you can get with a single, simple sequencer. That
  simplicity wasn't free: data is not easily sharded, we skip the usual
  durability dance, and recovery still needs a human in the loop. But these were
  pragmatic trade-offs. Even with its limitations, a low-latency, totally
  ordered log is a bigger enabler for both simple and complex applications than
  it first appears.
class: text-center
drawings:
  persist: false
transition: slide-left
comark: true
duration: 25min
routeAlias: title
---

# Building a fast log

with a smidge of fault-tolerance

<!--

What do I mean by "fast", and more importantly "smidge" here?

By fast I mean double-digit microsecond append times with 10G throughput, and by
smidge I mean there are some situations we will never automatically recover from
without a human.

Hoping you take away some appreciation for the tradeoffs I'll discuss, even if
they're a bit unfashionable.

-->

---
routeAlias: hi
---

# Hi

I'm Doug

<!--

- work at Jane Street
- on a distributed log called "Aria" for the past 6ish years
- we've talked about Aria before
- Signals and Threads (SMR)
- Tech Blog (testing)
- today: weird architecture

-->

---
routeAlias: confession
---

# A confession
[](no-subtitle-hack) <!-- otherwise the images become a subtitle -->

![](./receipt.png){v-click="", class="inline-block h-80 mr-8 mt-8 shadow"}
![](./ddia.png){v-click="", class="inline-block h-80 mt-8 shadow"}

<!--

- I'm not an expert in distributed systems
- never even took a course
- I learned a tiny part of the field on the fly at JS
- one week after agreeing to give this talk, I bought a book
- this book
- I thought I could educate myself so that I didn't sound foolish
- but I decided instead, I'm going to just share what I know with the best
  context I can
- if something sounds weird, it's probably me and not you

-->

---
routeAlias: what-is-a-log
---

# What is a log?

<LogTape class="mt-16" />

<!--

- append-only data file
- that's basically the definition
- example: database WAL
- logs are great for feeding into state machines

-->

---
routeAlias: what-is-a-distributed-log
---

# What is a distributed log?

<DistributedLogTape class="mt-16" />

<!--

- it's the multiplayer version of logs
- many actors distributed all over operating together
- you can still only append
- and everyone sees the same log: all records in the same order
- this is called total ordering and it's the most important part of this talk
- Kafka is an example of a popular distributed log
- one common use-case: write events for downstream consumers
- we're going to talk about something else

-->

---
layout: center
routeAlias: obsessed
---

# Jane Street is a bit obsessed with logs

and historically allergic to databases

<!--

- Aria is not the first log abstraction we've built, nor is it the second or third
- We *do* use dbs, but for a number of reasons, they haven't been the easy choice
- (though this is changing)
- [ ] something about dbs that is more satisfying

-->

---
routeAlias: mental-model
clicks: 11
---

# One mental model for building on a distributed log

<MentalModel />

<!--

- We start with a log that contains lots of records from different components in
  our service
- [click] We build a state machine, but it doesn't want every message
- [click] So we filter the log down to only the messages we want
- [click] Then we iterate, modifying our state
- [click] Now our application might want to do something, maybe due to some side
  effect
- [click] It sends a <star> message, but there's also another in flight.
  Importantly, it does not incorporate this message into its own state
- [click] The appends land in some order
- [click] You also aren't waiting for an "ack", you just keep going
- [click] You're forced to deal with the potential race condition
- [click] When you see your message, you finally process it
- [click] And occasionally, you snapshot and continue to start up from there
  next time.

-->

---
layout: center
routeAlias: like-this-pattern
---

# We like this pattern

but it has limitations

<v-clicks>

- Logs are flexible
- Total ordering gives you *consensus*
- But it is inherently a bottleneck

</v-clicks>

<!--

- [click] You decide the data and how it is interpreted
- [click] Total ordering is *consensus*
    - All race conditions are settled on the log
    - All consumers can agree on the outcome without further communication
- [click] If there is exactly one order, that order must be determined by one
  thing
- (At least, I think)
- ?
    - Sharding gives you independent ordering
    - Trying to reconstruct imposes latency costs

- The utility goes down the more you have to compromise
- [ ] Total ordering means one process: a sequencer
- [ ] "maximize total ordering"
- If everyone is thinking about the same log as the source of truth, we want to
  make it big

-->

---
routeAlias: aria-goal
---

# We made Aria to be a platform teams could build on

How far can we push fast, low-latency total ordering within one shard?

<v-clicks>

- Speed (~30us round-trip)
- Scale (up to 10Gbps write per Aria instance, plenty of fanout)
- Reliability (historically good uptime, predictable performance, data retention)

</v-clicks>

<v-click>

## But a quick reality check

This isn't like, the backbone of Jane Street or something

</v-click>

<!--

- [click] This does matter to us more. But sometimes latency is bottleneck on
  throughput
- [click] There's not just "one" Aria: each region has at least one, some
  users get their own, some for cloud environments, etc.
- [click] Reliability: no number here, but more than just "uptime"
- [click] I don't want to give you the wrong impression. Lots of systems at JS,
  different requirements, etc.

-->

---
layout: center
routeAlias: architecture
---

# A brief snapshot of Aria

<!-- It has evolved a lot! And it will keep evolving -->

---
routeAlias: speed
clicks: 5
---

# Designing for speed

You need a sequencer, so keep it simple

<script setup>
const cheapAppends = `
graph LR
  subgraph aria [" "]
    injectors:::core@{ shape: st-rect, label: "injectors" }
    sequencer:::primary@{ shape: rect, label: "sequencer" }
    publishers:::core@{ shape: st-rect, label: "publishers" }
    disk:::disk@{ shape: cyl, label: " " }
    class disk core
    injectors e2@--> sequencer
    sequencer e3@--> disk
    disk e4@--> publishers
  end
  producers:::client@{ shape: st-rect, label: "clients" }
  consumers-1:::client@{ shape: st-rect, label: "clients" }
  consumers-2:::client@{ shape: st-rect, label: "clients" }
  producers e1@--> injectors
  publishers e5@--> producers
  publishers e6@--> consumers-1
  publishers e7@--> consumers-2
`
</script>

<AnimatedMermaid :code="cheapAppends" :steps="[['e1'], ['e2'], ['e3', 'e4'], ['e5', 'e6', 'e7'], ['e1', 'e2', 'e3', 'e4', 'e5']]" />

<div class="text-center mt-6 text-xl op80">
<v-switch>
<template #0>

TODO: intro — the shape of a single Aria cluster

</template>
<template #1>

TODO: step 1 — clients send appends to the injectors

</template>
<template #2>

TODO: step 2 — injectors hand off to the sequencer

</template>
<template #3>

TODO: step 3 — sequencer stamps and persists to disk

</template>
<template #4>

TODO: step 4 — publishers fan out to clients

</template>
<template #5>

TODO: step 5 — the full append loop

</template>
</v-switch>
</div>

<!--

- sequencer simple; push complication out
- scaling through ingress (injectors) and egress (publishers)
- [ ] "stamp with a timestamp" -> ??
- (?) server coordination (control plane?) on the log too

- [ ] fill out click footers above?
- [ ] use click notes below

[click:2] 2

[click] 3

- [ ] talk about bare metal, userspace networking, specialized nics


I can't tell if latency should be its own section after this, or just talked
about between these two, or after the next one (since it introduces the extra
hop).

-->

---
routeAlias: durability
clicks: 1
---

# Designing for durability

Putting bounds on data loss

<script setup>
const durabilityBase = `
graph LR
  classDef inactive-edge opacity:0.2
  producers:::client@{ shape: st-rect, label: "clients" }
  consumers-1:::client@{ shape: st-rect, label: "clients" }
  consumers-2:::client@{ shape: st-rect, label: "clients" }
  subgraph aria [" "]
    subgraph node-1 [" "]
      injectors-1:::core@{ shape: st-rect, label: "injectors" }
      sequencer-1:::primary@{ shape: rect, label: "sequencer-1" }
      publishers-1:::inactive@{ shape: st-rect, label: "publishers" }
      disk-1:::disk@{ shape: cyl, label: " " }
      class disk-1 core
      injectors-1 e2@--> sequencer-1
      sequencer-1 e3@--> disk-1
      disk-1 e4@-.-> publishers-1
      class e4 inactive-edge
    end
    subgraph node-2 [" "]
      injectors-2:::inactive@{ shape: st-rect, label: "injectors" }
      sequencer-2:::inactive@{ shape: rect, label: "sequencer-2" }
      publishers-2:::core@{ shape: st-rect, label: "publishers" }
      disk-2:::disk@{ shape: cyl, label: " " }
      class disk-2 core
      injectors-2 e8@-.-> sequencer-2
      sequencer-2 e9@-.-> disk-2
      disk-2 e10@--> publishers-2
      class e8,e9 inactive-edge
    end
    subgraph node-3 [" "]
      injectors-3:::inactive@{ shape: st-rect, label: "injectors" }
      sequencer-3:::inactive@{ shape: rect, label: "sequencer-3" }
      publishers-3:::core@{ shape: st-rect, label: "publishers" }
      disk-3:::disk@{ shape: cyl, label: " " }
      class disk-3 core
      injectors-3 e11@-.-> sequencer-3
      sequencer-3 e12@-.-> disk-3
      disk-3 e13@--> publishers-3
      class e11,e12 inactive-edge
    end
  end
  style aria fill:none,stroke:none
  producers e1@--> injectors-1
  publishers-1 ~~~ producers
  publishers-2 e14@--> producers
  publishers-2 --> consumers-1
  publishers-3 --> consumers-2
  network:::net@{ shape: hex, label: "network" }
  network en1@-.- node-1
  network en2@-.- node-2
  network en3@-.- node-3
  classDef net-edge stroke:#fb923c,stroke-width:2px
  class en1,en2,en3 net-edge
`

// Click 1 animates the producer's write -> replicate -> read path, and bolds
// all the network links to highlight how data is distributed.
const durabilityFlow = ['e1', 'e2', 'e3', 'e10', 'e14']
  .map((e) => `  ${e}@{ animate: true }`)
  .join('\n')
const durabilityFrames = [
  durabilityBase,
  `${durabilityBase}\n${durabilityFlow}\n  classDef net-blink stroke:#fb923c,stroke-width:2px,animation: net-blink 1.2s step-end infinite\n  class en1,en2,en3 net-blink`,
]
</script>

<AnimatedMermaid :frames="durabilityFrames" class="transform scale-75 origin-top" />

<!--

- [ ] needs clicks
- [ ] herd / multicast to keep strain off sequencer/network
- rule of 2
- latency: disk writes out of hot loop, ring buffer + backpressure gossip
- non-scaling because single log is processed by each node (not inherent)
- multicast + bare metal + low-latency nic + native user space networking
- multicast is optimization, still have cloud presence
- [ ] latency here?
- [ ] rule of 2 leads to recovery

-->

---
routeAlias: losing-writes
clicks: 3
---

# Promoting the wrong sequencer

The serving node is the most ahead — promote one that's behind and new appends land at offsets that already mean something else

<DataLoss class="mt-8" />

<!--
- rule of 2: the node serving clients (publishers on B) is the furthest ahead
- 4 & 5 aren't lost — clients saw them and B still has them
- but promote C (behind) and its new appends collide with B's offsets → divergence
-->

---
routeAlias: split-brain
clicks: 4
---

# Promoting two sequencers

Promote a second sequencer while the first is only *presumed* dead — when it comes back, both have stamped different records at the same offsets

<SplitBrain class="mt-8" />

<!--
- this is why the sequencer is the one thing we don't make redundant
- two active sequencers = two truths for the same offset = corruption
- we revisit this in the failover sequence next
-->

---
routeAlias: fault-tolerance
clicks: 4
---

# Fault tolerance

And other ugly truths

<FaultTolerance />

<!--

- redundancy everywhere except sequencer
- consensus algorithms are easy to get wrong
- hardware is more reliable than you think
- in practice, actual downtime is very low
- but also: we're actively working on this

- [ ] failure mode for >1 node loss
    - no quorum
    - datacenter loss
    - "press the button" is a bit reductive
        - "built the thing ourselves" tie-in
    - JS uptime requirements are different
    - good correlation between developer availability and uptime value
    - choose your own redundancy
- [ ] actual downtime numbers

-->

---
layout: section
routeAlias: usage
---

# All this for state machine replication

<!--
- We wanted to make it really easy to use; primitives are pub/sub; component
  architecture for composition
- It is very flexible, if you know what you're doing
- But people did some very cool things with it
-->

---
routeAlias: rocksdb
---

# Distributed RocksDB

- RocksDB is an embeddable persistent key-value store
- What if we published operations on the log? And applied them once we consumed?
- But if you want linearizability, you need to build that

---
routeAlias: eventual-consistency
clicks: 2
---

# Global eventual consistency

- Write to the log in your region for fast, persistent updates
- Your region's log is relayed to a global log
- Your region's view is the global log plus the unrelayed region tail

<EventualConsistency class="mt-8" />

---
routeAlias: history
---

# The log as a history

- Time-travel interactive debugger -- with breakpoints
- Replay into the same state machine for bug or performance analysis
- Build one-off tools that use the log as a query

<!-- Might cut this -->

---
layout: section
routeAlias: end
---

# it's over?

---
layout: section
routeAlias: endend
---

# ok now it's over

<https://dpatti.com>

<!--

# These are miscellaneous notes that don't have a home

## Consensus from a single log

- like type systems eliminate a large class of bugs, same with building on aria
- still need to reason through race conditions at send time, but not receive time

## Latency and simple app design

- When your tail latency is predictable, you can design around it
- No optimistic updates, no local caching

diagrams
- split brain
- promoting the wrong sequencer / rule of 2 violation

- storage is left a little too abstract; "what does it mean to have a cylinder"
    - tie in "every node has all data"

- this is not big big data scale

- snapshotting
    - could do it earlier

- speed / scale / reliability numbers

- first mention of Aria

- mental model: number/label

- fault tolerance: "single point of failure" is not super clear
    - move client arrow
    - promote sequencer -> deactivate publishers

- git rebase analogy

- state machine wants to append a message: confusing?
    - wrap in application

- "trading colos" -> low latency local datacenter

- fold -> iterate

- "distributed log" -> distributed in the sense of participation, not storage

- global eventual consistency -> interesting enough?

- "why not kafka?" -> when talking about the sharding
- "why not database?" -> say more than cultural; cultural feels very
  unsatisfying

- nix paradox slide

- "adding more batching" -> maybe nix

- fix vertical alignment of text in nodes

- maybe animate network line

-->
