---
title: "Midterm GSoC Updates"
date: 2016-06-25 03:35:00 +0300
categories: COSA
tags: GSoC-16 Python Theano Multi-GPU CUDA
---
This week I am going to present in detail my pull request in [**Theano**](http://deeplearning.net/software/theano/)'s
**libgpuarray** project. As I referred in my previous blog [post]({% post_url 2016-06-10-multi-gpu-and-platoon %})
, this pull request will provide multi-gpu collectives support in
[**libgpuarray**](https://github.com/Theano/libgpuarray). The API exposed for
this purpose is described in two header files: `collectives.h` and `buffer_collectives.h`.

Some libgpuarray API
--------------------

Before, explaining collectives API I must refer to some **libgpuarray**
structures that user has to handle in order to develop functioning software.

* `gpucontext`: This structure is declared in [*buffer.h*](https://github.com/Theano/libgpuarray/blob/master/src/gpuarray/buffer.h#L34).

This is used to describe what the name means, a GPU context. A context of gpu is
a concept which represents a process running in gpu. In general, a context can be "pushed"
to a GPU and all kernel operations scheduled while that context is active will
be executed accordingly. A context keeps track of state related information to a
GPU process (distinct memory address, allocations, kernel definitions).
A context is "poped" out, when user does not want to use it anymore. In
**libgpuarray**, `gpucontext` is assigned to a single gpu on creation and is used also
to refer to the gpu which will be programmed. A call to
[*gpucontext_init*](https://github.com/Theano/libgpuarray/blob/master/src/gpuarray/buffer.h#L46)
will create an instance and at least one call is necessary to make use of the
rest library.

`gpucontext* gpucontext_init(const char* name, int dev, int flags, int* ret);`

* `gpudata`: This structure is declared in [*buffer.h*](https://github.com/Theano/libgpuarray/blob/master/src/gpuarray/buffer.h#L27).

It represent allocated data in a device which is handled by a single
`gpucontext`. A call to [*gpudata_alloc*](https://github.com/Theano/libgpuarray/blob/master/src/gpuarray/buffer.h#L157)
will return an allocated `gpudata`
which refers to an allocated buffer space of size `sz` (in bytes) in the GPU
selected through the `ctx` provided. Optionally, pointer `data` in host's memory
can be provided along with `GA_BUFFER_INIT` as `flags` for copying `sz` bytes
from host to the newly allocated buffer in GPU.

`gpudata* gpudata_alloc(gpucontext* ctx, size_t sz, void* data, int flags, int* ret);`

* `GpuArray`: This structure is declared in [*array.h*](https://github.com/Theano/libgpuarray/blob/master/src/gpuarray/array.h#L23).

It represents a **ndarray** in GPU. It is a container, similar to **Numpy**'s one,
which places specific vector space attributes to a `gpudata` buffer. It contains
number and size of dimensions, strides, offset from original device pointer in
`gpudata`, data type and flags which indicate if a `GpuArray` is aligned,
contiguous and well-behaved. It can be created in 4 ways: As an empty
array, as an array filled with zeros, using previously allocated `gpudata` or
using an existing host **ndarray**. All of them need information about number, size
of dimensions, strides (the first two through data order) and data type. We will
use the two following:

> ```
> int GpuArray_empty(GpuArray* a, gpucontext* ctx, int typecode,
>                                 unsigned int nd, const size_t* dims,
>                                 ga_order ord);
> int GpuArray_copy_from_host(GpuArray *a, gpucontext *ctx, void *buf, int typecode,
>                                          unsigned int nd, const size_t *dims,
>                                          const ssize_t *strides);
> ```

Collectives API on GPU buffers
------------------------------

I will explain now how to use buffer-level API which exists in [*buffer_collectives.h*](https://github.com/Theano/libgpuarray/blob/master/src/gpuarray/buffer_collectives.h).
I am going to do this by presenting the test code as an example for convenience.

First of all, since we are going to examine a multi-gpu example, a parallel
framework is  used since [**NCCL**](https://github.com/NVIDIA/nccl) requires
that some of the API must be called in parallel for each GPU to be used. In this
example I am going to use **MPI**. I will omit the initialization of **MPI** and
its ranks and use `MPI_COMM_WORLD`. Each process will handle a single GPU device
and in this example the `rank` of an MPI process will be used to select a device
hardware number.

```
gpucontext* ctx = gpucontext_init("cuda", rank, 0, NULL);
gpucommCliqueId comm_id;
gpucomm_gen_clique_id(ctx, &comm_id);
```

A `gpucontext` is initialized and a unique id for gpu communicators is produced
with `gpucomm_gen_clique_id`.

```
MPI_Bcast(&comm_id, GA_COMM_ID_BYTES, MPI_CHAR, 0, MPI_COMM_WORLD);
gpucomm* comm;
gpucomm_new(&comm, ctx, comm_id, num_of_devs, rank);
```

Unique id is broadcast using **MPI** in order to be the same among GPU
communicators. A `gpucomm` instance is created which represents a communicator
of a single GPU in a group of GPU which will participate in collective
operations. It is declared in [*buffer_collectives.h*](https://github.com/Theano/libgpuarray/blob/master/src/gpuarray/buffer_collectives.h#L18).
`gpucomm_new` needs to know about the `ctx` to be used and the user-defined
rank of `ctx`'s device in the newly created group. Rank in a GPU group is user
defined and is independent of hardware device number or MPI process rank. For
convenience of this test example they are equal.

```
int* A = calloc(1024, sizeof(char));
int i, count = SIZE / sizeof(int);
for (i = 0; i < count; ++i)
  A[i] = comm_rank + 2;
int* RES = calloc(1024, sizeof(char));
int* EXP = calloc(1024, sizeof(char));

gpudata* Adev = gpudata_alloc(ctx, 1024, A, GA_BUFFER_INIT, &err);
gpudata* RESdev = gpudata_alloc(ctx, 1024, NULL, 0, &err);
```

Initialize buffers for input, expected and actual output.

```
gpucomm_reduce(Adev, 0, RESdev, 0, count, GA_INT, GA_PROD, 0, comm);
MPI_Reduce(A, EXP, count, MPI_INT, MPI_PROD, 0, MPI_COMM_WORLD);
```

For convenience, all collective operations are checked upon results of the
corresponding MPI collective operations. All collectives require a `gpucomm` as
an argument and sync implicitly so that all `gpucomm`s that participate in a GPU
group are called to a collective function. Collective
operations and documentation exist in [*buffer_collectives.h*](https://github.com/Theano/libgpuarray/blob/master/src/gpuarray/buffer_collectives.h).
Also, in that file you will find definition of `_gpucomm_reduce_ops`, one of
which is `GA_PROD` in example. Notice the similarity between **MPI** and **gpucomm**
signature.

> ```
> int gpucomm_reduce(gpudata* src, size_t offsrc, gpudata* dest,
>                    size_t offdest, size_t count, int typecode,
>                    int opcode, int root, gpucomm* comm);
> int MPI_Reduce(const void *sendbuf, void *recvbuf, int count,
>                MPI_Datatype datatype, MPI_Op op, int root,
>                MPI_Comm comm);
> ```

Currently supported collective operations are all operations supported by
**nccl**, as of now:

* `gpucomm_reduce`
* `gpucomm_all_reduce`
* `gpucomm_reduce_scatter`
* `gpucomm_broadcast`
* `gpucomm_all_gather`

```
if (rank == 0) {
  // Reading from RESdev `gpudata` to `RES` host pointer
  gpudata_read(RES, RESdev, 0, 1024);

  int res;
  MAX_ABS_DIFF(RES, EXP, count, res);
  if (!(res == 0)) {
    PRINT(RES, count);  // print RES array
    PRINT(EXP, count);  // print EXP array
    ck_abort_msg("gpudata_reduce with GA_INT type and GA_SUM op produced max "
                 "abs err %d", res);
  }
}
```

Result from root's GPU is copied back to host and then the expected and actual
results are compared.

```
free(A);
free(RES);
free(EXP);
gpudata_release(Adev);
gpudata_release(RESdev);
gpucomm_free(comm);
gpucontext_deref(ctx);
```

Finally, resources are released.

Complete testing code can be found in [*main.c*](https://github.com/Theano/libgpuarray/blob/master/tests/main.c), [*device.c*](https://github.com/Theano/libgpuarray/blob/master/tests/device.c), [*communicator.c*](https://github.com/Theano/libgpuarray/blob/master/tests/communicator.c) and
[*check_buffer_collectives.c*](https://github.com/Theano/libgpuarray/blob/master/tests/check_buffer_collectives.c) files. Framework [**libcheck**](https://libcheck.github.io/check/)
is used for C testing. Actual testing code contains setup and teardown functions, as well as
preprocessor macros and tricks for easily testing for all data and operation
types. From the example above, crucial error checking is missing for convenience.

Collectives API on GPU ndarrays
-------------------------------

```
gpucontext* ctx = gpucontext_init("cuda", rank, 0, NULL);
gpucommCliqueId comm_id;
gpucomm_gen_clique_id(ctx, &comm_id);

MPI_Bcast(&comm_id, GA_COMM_ID_BYTES, MPI_CHAR, 0, MPI_COMM_WORLD);
gpucomm* comm;
gpucomm_new(&comm, ctx, comm_id, num_of_devs, rank);

int(*A)[16];
A = (int(*)[16])calloc(32, sizeof(*A));
int(*RES)[16];
RES = (int(*)[16])calloc(32, sizeof(*RES));
int(*EXP)[16];
EXP = (int(*)[16])calloc(32, sizeof(*EXP));

size_t indims[2] = {32, 16};
size_t outdims[2] = {32, 16};
const ssize_t instrds[ND] = {sizeof(*A), sizeof(int)};
const ssize_t outstrds[ND] = {sizeof(*RES), sizeof(int)};
size_t outsize = outdims[0] * outstrds[0];
size_t i, j;
for (i = 0; i < indims[0]; ++i)
  for (j = 0; j < indims[1]; ++j)
    A[i][j] = comm_rank + 2;

GpuArray Adev;
GpuArray_copy_from_host(&Adev, ctx, A, GA_INT, ND, indims, instrds);
GpuArray RESdev;
GpuArray_empty(&RESdev, ctx, GA_INT, ND, outdims, GA_C_ORDER);
```

First create a `gpucomm` as before. Then initialize arrays in host and device to
be used in the test. The code above may seem difficult to read or a pain to be
written explicitly every time an array must be made, but **pygpu** python
interface to **libgpuarray** make it easy and readable.

```
if (rank == 0) {
  GpuArray_reduce(&Adev, &RESdev, GA_SUM, 0, comm);
} else {
  GpuArray_reduce_from(&Adev, GA_SUM, 0, comm);
}
MPI_Reduce(A, EXP, 32 * 16, MPI_INT, MPI_SUM, 0, MPI_COMM_WORLD);

if (rank == 0) {
  // Reading from RESdev `gpudata` to `RES` host pointer
  GpuArray_read(RES, outsize, &RESdev);
  int res;
  COUNT_ERRORS(RES, EXP, 32, 16, res);
  ck_assert_msg(res == 0,
                "GpuArray_reduce with GA_SUM op produced errors in %d places",
                res);
}
```

As before, results are checked upon MPI collectives' results. Collective
operations for `GpuArray`s and documentation exist in [*collectives.h*](https://github.com/Theano/libgpuarray/blob/master/src/gpuarray/collectives.h).
In this example, `GpuArray_reduce` is a function used to perform the reduce
collective operation on `GpuArray`s, while `GpuArray_reduce_from` is a function
which can be used by non-root `gpucomm` ranks to participate in this collective.

> ```
> int GpuArray_reduce_from(const GpuArray* src, int opcode,
>                          int root, gpucomm* comm)
> int GpuArray_reduce(const GpuArray* src, GpuArray* dest,
>                     int opcode, int root, gpucomm* comm);
> ```

Currently supported collective operations on `GpuArray`s:

* `GpuArray_reduce_from`
* `GpuArray_reduce`
* `GpuArray_all_reduce`
* `GpuArray_reduce_scatter`
* `GpuArray_broadcast`
* `GpuArray_all_gather`

```
GpuArray_clear(&RESdev);
GpuArray_clear(&Adev);
free(A);
free(RES);
free(EXP);
gpucomm_free(comm);
gpucontext_deref(ctx);
```

Again finally, resources are released.

In general and near future
-----------------------

Using this part of **libgpuarray** requires having **nccl** installed, as well
as **CUDA** >= v7.0 and GPUs of at least Kepler architecture, as suggested in nccl's
github page. Currently as there is no a collectives framework for **OpenCL**,
collectives operations are supported only for **CUDA** `gpucontext`. If **nccl** exists
in a default path in your system (whose bin directory that is contained in
environmental variable `PATH`), then it will be built automatically when
invoking `make relc` for example. Else, you need to specify through the variable `NCCL_ROOT_DIR`.

If you want to test, you need to have **MPI** and **libcheck** installed,
as well as have `Makefile.conf` file properly setup to declare how many and
which GPUs you want to use in order to test across many GPUs in your machine.

I want to note that testing with MPI and libcheck gave me a headache, when
trying to execute test binaries for the first time. MPI processes signaled a
SEGM FAULT reporting that memory address space was not correct. For anybody who
may attempt a similar approach for multi-process testing: I did not know that
libcheck forks and runs the tests in a subprocess. And it will happen that this
subprocess will not be the "registered" MPI process, thus giving an error when a
MPI command is issued with the expected MPI comm. To solve this, I turned off
forking before running the tests through libcheck API. See
[this](https://github.com/Theano/libgpuarray/blob/master/tests/main.c#L35).

Right now I am working in completing python support for collectives libgpuarray
API in **pygpu**. There will be a continuation blog post as soon as I finish.

> Till then, have fun coding!  
> Tsirif, 24/06/2016
