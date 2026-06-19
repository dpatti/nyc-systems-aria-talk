# Building a fast log with a smidge of fault-tolerance

A talk about Aria I gave on Jun 18 at [NYC Systems](https://nycsystems.xyz/).

[Slides](https://dpatti.github.io/nyc-systems-aria-talk/)

## Abstract

Distributed logs sit at the heart of many complex distributed systems, but you
don't need to be building a database to use one yourself. They are a powerful
tool for building reliable, stateful software. At Jane Street, we wanted to make
this style of programming more accessible to everyone, so we set out using what
we knew from low-latency exchange architecture to build and run a
general-purpose distributed log that others could build on top of. And thus Aria
was born.

In this talk, we'll look at the architecture and design choices that make Aria
what it is -- and how far you can get with a single, simple sequencer. That
simplicity wasn't free: data is not easily sharded, we skip the usual durability
dance, and recovery still needs a human in the loop. But these were pragmatic
trade-offs. Even with its limitations, a low-latency, totally ordered log is a
bigger enabler for both simple and complex applications than it first appears.
