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
---

# Building a fast log

with a smidge of fault-tolerance

<!--
The last comment block of each slide will be treated as slide notes. It will be
visible and editable in Presenter Mode along with the slide. [Read more in the
docs](https://sli.dev/guide/syntax.html#notes)
-->

---
layout: section
---

# Intro

---

# Opening

- open: platform without automatic failover
- my context
- concession

<!--
Speaker notes
-->

---

# Intro to log / distributed log

- log records: timestamp as seq num, topic for filtering, arbitrary payload & size, atomic primitive
- primitives: total ordering, exactly-once delivery, atomics
- exactly once: reading your own writes
- mental model shifts from req/res to append/observe
- one log, not chaining logs

<!--
Speaker notes
-->

---

# Why not a database? / another log?

- kafka comparison w/ vertical vs horizontal

<!--
Speaker notes
-->

---

# Latency and throughput numbers

- can I get lab to 10G?

<!--
Speaker notes
-->

---
layout: section
---

# Server

---

# Single-node sequencer + injectors over shmem

- sequencer: packet in -> stamp -> packet out
- scaling through ingress (injectors) and egress (republishers)
- herd protocol over UDP w/ retransmission
- archival and retrieval
- server coordination (control plane?) on the log too

<!--
Speaker notes
-->

---

# Invested in scaling over sharding

- non-scaling because single log is processed by each node (not inherent)
- multicast + bare metal + low-latency card + OCaml user space networking
- multicast is optimization, still have cloud presence
- network bandwidth and tuning

<!--
Speaker notes
-->

---

# Sequencer is single point of failure

- no fsync or quorum
- rule of 2
- choose your own redundancy?
- latency: disk writes out of hot loop, ring buffer + backpressure gossip

<!--
Speaker notes
-->

---

# No automated failovers if sequencer node goes down

- consensus algorithms are easy to get wrong
- hardware is more reliable than you think
- not inherent, is changing soon

<!--
Speaker notes
-->

---

# Putting it all together

```mermaid
graph LR
  subgraph Aria
    subgraph box1 [" "]
      injectors@{ shape: st-rect }
      sequencer:::primary
      buffer@{ shape: stadium }
      disk-1:::disk@{ shape: cyl, label: " " }
      injectors e1@--> sequencer
      sequencer e2@--> buffer
      buffer e3@--> disk-1
    end
    subgraph box2 [" "]
      buffer-2@{ shape: stadium, label: "buffer" }
      disk-2:::disk@{ shape: cyl, label: " " }
      publisher-2@{ shape: st-rect, label: "publishers" }
      buffer-2 e5@--> disk-2
      buffer-2 e6@--> publisher-2
    end
    subgraph box3 [" "]
      buffer-3@{ shape: stadium, label: "buffer" }
      disk-3:::disk@{ shape: cyl, label: " " }
      publisher-3@{ shape: st-rect, label: "publishers" }
      buffer-3 e7@--> disk-3
      buffer-3 e8@--> publisher-3
    end
    mcast@{ shape: circle, label: " " }
    buffer e9@-.- mcast
    mcast e10@-.- buffer-2
    mcast e11@-.- buffer-3
  end
  apps@{ shape: st-rect }
  publisher-2 e12@--> apps
  publisher-3 e13@--> apps
  apps e14@--> injectors

  e1@{ animate: true }
  e2@{ animate: true }
  e3@{ animate: true }
  e5@{ animate: true }
  e6@{ animate: true }
  e7@{ animate: true }
  e8@{ animate: true }
  e9@{ animate: true }
  e10@{ animate: true }
  e11@{ animate: true }
  e12@{ animate: true }
  e13@{ animate: true }
  e14@{ animate: true }
```

<!--
Putting everything together, we have a bunch of boxes, with injectors on the
active sequencer box, and publishers on the others, multicast connecting them,
in-memory buffers in the the hot loop, and asynchronous disk writes.
(Backpressure is elided for visual simplicity.)
-->

---
layout: section
---

# Client

---

# Consensus from a single log

- like type systems eliminate a large class of bugs, same with building on aria

<!--
Speaker notes
-->

---

# Latency and simple app design

- latency and simple app design

<!--
Speaker notes
-->

---

# What can you do

- simple motivator example?
- building a distributed rocksdb
- bring your own consistency model

<!--
Speaker notes
-->

---

# Testing and replay story

- testing and replay story

<!--
Speaker notes
-->

---
layout: section
---

# Conclusion

---

# Future plans

- future plans

<!--
Speaker notes
-->
