---
title: "Google Summer of Code 2016 has come to an end"
date: 2016-08-23 10:39:00 +0300
categories: Announcements
tags: General GSoC-16 Python Theano Platoon Multi-GPU Multi-Node Optimization Deep-Learning
---

Three months of coding under the hot summer sun have come to an end. Google
Summer of Code 2016 was the reason that got me involved into the backends of deep
learning frameworks and has further inspired me to continue to contribute in
this effort in the future. But for the time being, this summer has resulted in
**197** commits of **10798** insertions and **4430** deletions in total in two repositories
for the [**Theano**](http://www.deeplearning.net/software/theano/) project, the
symbolic computation framework for deep learning in **Python**.

## Summarizing the work during GSoC

### Theano/libgpuarray repository

For [**libgpuarray**](https://github.com/Theano/libgpuarray):
11 [pull
requests](https://github.com/Theano/libgpuarray/pulls?utf8=%E2%9C%93&q=is%3Apr%20author%3Atsirif%20is%3Aclosed%20merged%3A2016-05-23..2016-08-23%20)
were merged

> **98** commits in C, Python and Cython code of **7249** insertions and **3739** deletions

1. Wrapped NVIDIA's [**NCCL**](https://github.com/NVIDIA/nccl) library for
   multi-GPU collectives into a GPU framework-agnostic frontend.

    - [*Wrap multi-gpu communicator and collectives functionality of
      nccl*](https://github.com/Theano/libgpuarray/pull/193/commits)

2. Extended **pygpu**'s Python interface for GPU Numpy-like ndarrays to include
   multi-GPU collective operations.

    - [*Add python bindings for collectives in
      pygpu*](https://github.com/Theano/libgpuarray/pull/206/commits)

3. Added helper functions in **pygpu**'s general and GpuArray interface.

    - [*Add methods to read and write to/from existing ndarray in
      GpuArray*](https://github.com/Theano/libgpuarray/pull/224/commits)
    - [*Update python GpuArray write methods to transform src with
      asarray*](https://github.com/Theano/libgpuarray/pull/228/commits)
    - [*Interface for getting number of
      devices*](https://github.com/Theano/libgpuarray/pull/229/commits)

4. Fixed and enhanced various aspects of code and documentation.

    - [*Add missing cuStreamDestroy a context's memory
      stream*](https://github.com/Theano/libgpuarray/pull/186/commits)
    - [*Fix cuda wait for writes and
      reads*](https://github.com/Theano/libgpuarray/pull/222/commits)
    - [*Add checks to cuda_exit for cuda_waits and
      records*](https://github.com/Theano/libgpuarray/pull/223/commits)
    - [*Fix compilation error in
      device.c*](https://github.com/Theano/libgpuarray/pull/234/commits)
    - [*Fix documentation in pygpu
      collectives*](https://github.com/Theano/libgpuarray/pull/236/commits)
    - [*Update docs in site to contain collectives and optional
      requirements*](https://github.com/Theano/libgpuarray/pull/240/commits)

### mila-udem/platoon repository

For [**Platoon**](https://github.com/mila-udem/platoon):
1 [pull
request](https://github.com/mila-udem/platoon/pulls?utf8=%E2%9C%93&q=is%3Apr%20author%3Atsirif%20is%3Aclosed%20merged%3A2016-05-23..2016-08-23%20)
was merged

-  [*New control interface, extending worker/controller for
    multi-gpu/node*](https://github.com/mila-udem/platoon/pull/66/commits)

> **99** commits in Python code of **3549** insertions and **691** deletions

1. Extended worker/controller architecture for synchronous multi-GPU and
   **multi-node/GPU** collective operations and expose an `all_reduce` interface
   in Worker class.

2. Implemented a more sophisticated **error handling** and **launching** mechanism in
   order to support single-node and multi-node cases as well in the same code.

3. Wrapped Worker's `all_reduce` interface into a **Theano Op** in order to integrate
   unseemingly in a worker process which uses Theano.

4. Implemented distributed stochastic gradient descent algorithms (**global
   dynamics**) for
   data-parallel training procedures: Synchronous sum/average of parameter
   updates and synchronous variants of
   [*EASGD*](https://arxiv.org/abs/1412.6651v8) and
   [*Downpour*](http://research.google.com/archive/large_deep_networks_nips2012.html).


## Last but not least

Part of this work includes also the tests for the new features introduced. Every
test is successful with the exception of the functional tests for the multi-node
case of Platoon. Although that the test code exists (in fact it is the same with
the single-node case, only configuration changes), I have not yet succeeded in
deploying it in a cluster or a working set of MPI hosts. But I believe that this
issue will be solved soon though. After all, it was expected to make some trouble
as the design and implementation of multi-node/GPU collective operations in a
worker/controller architecture was the most challenging and interesting part.

> Till the next adventure, keep on coding  
> Tsirif, 2016-08-23
