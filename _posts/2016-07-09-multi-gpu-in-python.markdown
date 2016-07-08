---
title: "Multi GPU in Python"
date: 2016-07-09 02:47:00 +0300
categories: COSA
tags: GSoC-16 Python Theano Multi-GPU CUDA
---
This week's blog post concerns the development of python bindings for multi-gpu
collective operations support of [**libgpuarray**](https://github.com/Theano/libgpuarray).
As described in the previous blog [post]({% post_url 2016-06-24-midterm-gsoc-updates %})
, I have included support for collective operations in **libgpuarray** exposing
a gpu computational framework agnostic API. So far, this supports only the
[**NCCL**](https://github.com/NVIDIA/nccl) on CUDA devices.

PyGPU collectives module
------------------------

So now I am going to describe the API which a user will use by importing the
[*collectives*](https://github.com/Theano/libgpuarray/blob/master/pygpu/collectives.pyx)
module of [**pygpu**](https://github.com/Theano/libgpuarray/tree/master/pygpu) package. It is composed of two
classes: `GpuCommCliqueId` and `GpuComm`. It depends on the [*gpuarray*](https://github.com/Theano/libgpuarray/blob/master/pygpu/gpuarray.pyx)
module for using a `GpuContext` instance which describes a GPU process to be executed
on a single GPU. For binding with **libgpuarray** and interfacing with CPython code,
[Cython](http://docs.cython.org/) is utilized.

`GpuCommCliqueId` is used to create a unique id in a host to be shared among
separate processes which manage a GPU. All GPUs corresponding to these proesses
are intended to be grouped into a communicating clique. Another framework for
interprocess communication must be used in order to communicate the contents of
this clique id, such as [mpi4py](https://mpi4py.readthedocs.io/en/stable/), which bind **MPI** C-API in python.

To instantiate a `GpuCommCliqueId` one must provide the `GpuContext` in which it
will be used. By default, a unique id is created using *libgpuarray*'s API and
saved upon creation but the user may select to provide a predefined `bytearray`
id to be contained in this structure. As of now, `GpuCommCliqueId` exposes the
Python buffer interface, so it can be used by **numpy** or other buffer-likes or
consumers to get zero-copy access to the internal `char[GA_COMM_ID_BYTES]` array
containing the id. This means that an instance of this class can be passed as is
to the *mpi4py* for broadcasting to other participating processes.

In order to create a multi-gpu communicator, one must pass a `GpuCommCliqueId`
instance, the number of participating GPUs and a user-defined rank of this
process's GPU in the clique as arguments.

Collective operations for this `GpuComm`'s participating GPUs are methods of
this instance:

* **Reduce**

```
def reduce(self, GpuArray src not None, op, GpuArray dest=None, int root=-1)
    """Reduce collective operation for ranks in a communicator world.

    Parameters
    ----------
    src: :ref:`GpuArray`
        Array to be reduced.
    op: string
        Key indicating operation type.
    dest: :ref:`GpuArray`, optional
        Array to collecti reduce operation result.
    root: int
        Rank in `GpuComm` which will collect result.

    Notes
    -----
    * `root` is necessary when invoking from a non-root rank. Root caller
    does not need to provide `root` argument.
    * Not providing `dest` argument for a root caller will result in creating
    a new compatible :ref:`GpuArray` and returning result in it.
    """
```

Reduce operation needs a `src` array to be reduced and a Python string `op` for
the operation to be executed across GPUs. `dest` array can be omitted. In this
case, if the caller is the root rank (either `root` argument is not provided or
`root` argument is the same as the caller's `GpuComm` rank) a consistent with
the `src` array result will be created an returned.

* **AllReduce**

```
def all_reduce(self, GpuArray src not None, op, GpuArray dest=None)
    """AllReduce collective operation for ranks in a communicator world.

    Parameters
    ----------
    src: :ref:`GpuArray`
        Array to be reduced.
    op: string
        Key indicating operation type.
    dest: :ref:`GpuArray`, optional
        Array to collect reduce operation result.

    Notes
    -----
    * Not providing `dest` argument for a root caller will result in creating
    a new compatible :ref:`GpuArray` and returning result in it.
    """
```

AllReduce operation needs a `src` array to be reduced and a Python string `op`
for the operation to be executed across GPUs, as in the Reduce operation. If a
`dest` array is omitted a `src`-like result array will be created and
returned.

* **ReduceScatter**

```
def reduce_scatter(self, GpuArray src not None, op, GpuArray dest=None)
    """ReduceScatter collective operation for ranks in a communicator world.

    Parameters
    ----------
    src: :ref:`GpuArray`
        Array to be reduced.
    op: string
        Key indicating operation type.
    dest: :ref:`GpuArray`, optional
        Array to collect reduce operation scattered result.

    Notes
    -----
    * Not providing `dest` argument for a root caller will result in creating
    a new compatible :ref:`GpuArray` and returning result in it.
    """
```

ReduceScatter operation needs a `src` array to be reduced and a Python string `op`
for the operation to be executed across GPUs, as in the Reduce operation. If a
`dest` array is omitted, then a proper `dest` array will be created and
returned. The result array will be shortened in comparison to `src` in a single
dimension (according to C/F contiguity and clique size) and if that dimension
has size equal to 1, then it will be omitted.

* **Broadcast**

```
def broadcast(self, GpuArray array not None, int root=-1)
    """Broadcast collective operation for ranks in a communicator world.

    Parameters
    ----------
    array: :ref:`GpuArray`
        Array to be reduced.
    root: int
        Rank in `GpuComm` which broadcasts its `array`.

    Notes
    -----
    * `root` is necessary when invoking from a non-root rank. Root caller
    does not need to provide `root` argument.
    """
```

As usual, the user must provide the `array` to be broadcast across all GPUs in
the clique.

* **AllGather**

```
def all_gather(self, GpuArray src not None, GpuArray dest=None,
               unsigned int nd_up=1)
    """AllGather collective operation for ranks in a communicator world.

    Parameters
    ----------
    src: :ref:`GpuArray`
        Array to be gathered.
    dest: :ref:`GpuArray`, optional
        Array to receive all gathered arrays from ranks in `GpuComm`.
    nd_up: unsigned int
        Used when creating result array. Indicates how many extra dimensions
        user wants result to have. Default is 1, which means that the result
        will store each rank's gathered array in one extra new dimension.

    Notes
    -----
    * Providing `nd_up` == 0 means that gathered arrays will be appended to
    the dimension with the largest stride.
    """
```

AllGather operation needs a `src` array to be collected by all GPUs in the
clique. `dest` array can be omitted, but then a result array will be created and
returned according to the clique size and `src` array contiguity. The returned
array in this case will have as many dimensions as the `src` array plus the
`nd_up` argument provided. The extra dimension will be used to contain
information from each GPU. In case `nd_up` is equal to 0, then all arrays will
be stored in rank sequence across the largest in stride dimension (depends on
C/F contiguity). `nd_up` is by default equal to 1.

Right now, I am testing this code in question and I expect it to be checked and
merged soon.

> Till then, keep on coding  
> Tsirif
