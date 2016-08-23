---
title: "Multi-GPU and Platoon"
date: 2016-06-11 02:23:00 +0300
categories: COSA
tags: GSoC-16 Python Theano Multi-GPU CUDA OpenCL Optimization Deep-Learning
---
[**Theano**](http://deeplearning.net/software/theano/) has began to develop two
relatively new frameworks to extend her functionality for her user, as well as for
her contributor. The first one is a new GPU frontend (and backend from Theano's
perspective) which aims to make to make GPU programming easier in general and
backend-agnostic. The second one is a framework targeted for those who are using
Theano to train their deep learning models.

libgpuarray/pygpu
-----------------

The [**libgpuarray**](http://deeplearning.net/software/libgpuarray/installation.html) is
a library which provides a gpu programmer a two level facade. This facade is an
efficient wrapper of both **CUDA** and **OpenCL** APIs for GPU programming. User selects the
backend which he is going to use at runtime and the library provides him with a basic
`gpucontext`, which represents abstractly the usual executable GPU context, to use it
for `gpudata` or `gpukernel` handling. The lower [*"buffer"*](https://github.com/Theano/libgpuarray/blob/master/src/gpuarray/buffer.h)
facade level provides the user with basic structures and functions to handle data,
kernel and context in the way that the regular GPU APIs provide (as e.g. the CUDA
Driver API). The higher [*"array"*](https://github.com/Theano/libgpuarray/blob/master/src/gpuarray/array.h)
level provides a full array interface with structures and functions which are similar
to **Numpy**'s ndarrays. Partial **BLAS** (e.g. GEMM) support also exists at both levels.

In supplement to **libgpuarray**'s C API, this framework also delivers Python
bindings and a module that provides numpy-like GPU ndarrays! This is the most
interesting part for Python users as it extends their already powerful numpy
framework to include GPU calculations. Theano uses **pygpu** as its backend as of
recent. :D

[//]: # (libgpuarray:specific)
My role, as explained in a previous [post]({% post_url 2016-04-27-Google-Summer-of-Code-adventure-begins %})
, is to extend Theano's GPU support and develop towards including multi-gpu/node
functionalities. Working on the second part right now, I am including a multi-gpu
collectives API in libgpuarray in the same original spirit. Considering that the only
multi-gpu (and less - as of now - multi-node (well the guys put much effort for
things to be optimized)) MPI-like interface out there is NVIDIA's recently developed
[nccl](https://github.com/NVIDIA/nccl), libgpuarray will at first support only
collectives for CUDA backend. Finally, Python bindings and module for easy multi-gpu
programming will be provided through pygpu. Totally, general support for
collective multi-gpu programming in Python.

Follow and participate to the discussions in this [thread](https://groups.google.com/forum/#!topic/theano-dev/pRuqbclL_Cw)
of **theano-dev** google group. Also, you can watch the [pull request](https://github.com/Theano/libgpuarray/pull/193)
discussions on Github, in order to follow more closely its progress.

Platoon
-------

The second framework I referred to in the introduction is [Platoon](https://github.com/mila-udem/platoon)
. As of now, **Platoon** is described as:  

> Experimental multi-GPU mini-framework for Theano
>
> It supports data-parallelism inside one compute node, not model-parallelism.[...]  

It provides a controller/worker template architecture for creating distributed
training procedures for deep learning models. It extends Theano in a way that her
user, that needs to train faster larger models which were created with Theano, will
use this to improve training performance. Note that it refers only to
data-parallelism. This means that each worker process (which is responsible for
managing a single GPU) uses every parameter that a to-be-trained model has. And
Platoon will remain this way, as model-parallelism is handled elsewhere. Improvements
on performance can be found in the latest (2016/05/09) Theano's technical [report](https://arxiv.org/abs/1605.02688)
(search for *"Platoon"*).

Nevertheless, distributed training algorithms are kind of a new area to explore,
especially for deep learning problems. But with the ever-evolving capabilities of
GPUs, there is for sure interest in the field. Currently, there are two algorithms
implemented in Platoon: An asychronous Stochastic Gradient Descent [SGD from now on
and ever :P] and [Elastic Averaging SGD](https://arxiv.org/abs/1412.6651).

I have two goals considering the development of Platoon. The first is to extend its
worker/controller API for multi-gpu and multi-node programming. Of course for this
purpose **pygpu** will be used in conjunction with a Python MPI framework to work out
a worker interface for multi-gpu/node collectives in Python. This interface is
intended to be easy to use and intuitive in order to be used in constructing readable
and efficient distributed training algorithms. For starters at least, there won't be
any effort in making an optimized implementation (nccl tries to make multi-node
topology-optimized/aware framework - libgpuarray/pygpu will follow this course and
platoon worker/controller will provide a working multi-gpu/node interface
throughout). You can follow and participate in the designing discussions in this
[thread](https://groups.google.com/d/msg/theano-dev/QcF6XINfy_M/bdhFpXKyAwAJ) of
theano-dev (see proposed design discussions there).

The second goal is to make Platoon an experimentation and development framework for
distributed training dynamics, as well as a gallery of reusable (and easily
configurable) implemented parts of training algorithms. The user will be able to
utilize existing code parts in combination easily in order to create a specific
variant of an algorithm. These parts can be combined through a provided
`GenericTraining` interface or used as standalones in user's code. The user will be
able also to create his/her own parts easily through Theano + `Worker` interface (or
actually his/her own defined functions). Generic validation and testing tools will be
also provided. This will be implemented by realizing that a training algorithm is
consisted of the following, independent yet influential to training procedure, parts:

1. **Sampling** strategy
2. **Local** (per worker/particle) minimization dynamics
3. A condition which dictates when local information should be **combined**
4. **Global** minimization dynamics (sync rule)
5. A condition which dictates when training is considered to have **ended**

You can see more of this discussion in the same Platoon thread as above, as well as
in the documentation in my [fork](https://github.com/tsirif/platoon/blob/feature/general_opt_algo/platoon/generic_training.py)
of Platoon.

> Keep coding!  
> Tsirif, 10/06/2016
