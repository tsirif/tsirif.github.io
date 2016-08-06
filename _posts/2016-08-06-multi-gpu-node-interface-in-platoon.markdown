---
title: "Multi-GPU/Node interface in Platoon"
date: 2016-08-06 02:56:00 +0300
categories: COSA
tags: GSoC-16 Python Theano Platoon Multi-GPU Multi-Node Training
---
Last weeks I was working on a new interface in
[**Platoon**](https://github.com/mila-udem/platoon) which will support
collective operations for [**Theano**](https://github.com/Theano/Theano)'s GPU shared variables over multiple GPUs
over multiple hosts. This will enable **Platoon** to train your Theano models using
multiple GPUs even if they do not reside in the same host.

Usage
-----

In order to use it, a worker file needs to be provided. A worker file defines
the training process of a single set of model parameters in a parallel and
distributed manner. Optionally and in case you want to extend the distributed
computation capabilities of the training process, you are encouraged to provide
a controller file which extends the default one ([**platoon.controller**](https://github.com/tsirif/platoon/blob/feature/new-interface/platoon/controller.py) module) in
this framework. User must invoke the
[*platoon2-launcher*](https://github.com/tsirif/platoon/blob/feature/new-interface/scripts/platoon2-launcher)
script in order to start training with the new interface.

**Platoon** is configured through the command-line arguments of this launcher and in
case of their absence (or if it needed) through environmental variables or
Platoon configuration files. Please read
[*platoonrc.conf*](https://github.com/tsirif/platoon/blob/feature/new-interface/platoonrc.conf) in package's root
directory to learn about every way that Platoon can be configured.

If single-node is explicitly specified through command-line arguments, the
specified devices will be used in the GPU communicator world in the order they
are parsed. The same thing applies also for lists of devices found in platoon
environmentals or configuration files.

*e.g. usage*:

- `platoon2-launcher lstm -D cuda0 cuda3` (explicit config)
- `platoon2-launcher lstm`  (config with envs/files - may be multi-node)

If multi-node is explicitly specified through command-line arguments, extra
configuration through appropriate environmentals per host or files needs to be
done in order to describe which devices will be used in each host. Host names
are given the same way they are given in MPI's `mpiexec`.

*e.g. usage*:

- `platoon2-launcher lstm -nw 2 2 -H lisa0 lisa1` (2 gpus on lisa0 and 2 gpus on lisa1)

Please notice that this launcher is used to set up the new worker interface (the old
is still usable - but not in multi-node configs). The new worker interface
supports only CUDA devices currently. NVIDIA's [**NCCL**](https://github.com/NVIDIA/nccl) collectives library and
[**pygpu**](https://github.com/Theano/libgpuarray) are required for multi-GPU, while [**mpi4py**](https://mpi4py.readthedocs.io/en/stable/) is required in addition for
multi-node.

API description and how it works
--------------------------------

I will now describe how the new API works and its usage in training code.

**Platoon** uses a controller/worker architecture in order to organize multiple
hosts which own multiple GPUs. A controller process is spawned in each host,
which is responsible for organizing its worker processes and communicating with
controller processes in other hosts for computing. In addition, there are as
many worker processes in each host as there are devices which participate in the
computation procedure. Each worker process is responsible for a single
computation device. By this I mean that a worker process will contain Theano
code which act on a single device and will use a [**Worker**](https://github.com/tsirif/platoon/blob/feature/new-interface/platoon/worker.py)
instance in order to exploit multi-GPU/node computation.

![platoon architecture]({{ site.url }}/images/platoon_architecture.png)

By default, someone who wishes to write code for training a model with
**Platoon** must write the code which will run for worker processes. Theano
functions are to be created as usual which will be executed on a single Theano
device. This device is configured for the worker process by the
`THEANO_FLAGS="device=<...>"` environmental variable which is set by the launching procedure.
Among single GPU computation there will be multi-GPU/node computations which are
caused by calls to **Platoon**'s interface. While developing training code, the
user must create the corresponding Theano GPU shared variables which will be used
as arguments to **Platoon**'s new interface.

> ```
> import os
> from platoon.worker import Worker
> import theano
> import numpy as np
>
> # instantiate a worker
> worker = Worker(control_port=5567)
> # how many workers are there across all hosts
> total_nw = int(os.environ['PLATOON_TEST_WORKERS_NUM'])
>
> # make Theano shared variables for input and output
> inp = np.arange(32, dtype='float64')
> sinp = theano.shared(inp)
> out = np.empty_like(inp)
> sout = theano.shared(out)
>
> # execute interface
> worker.all_reduce(sinp, '+', sout)
>
> expected = total_nw * inp
> actual = sout.get_value()
> assert np.allclose(expected, actual)
> ```
> Minimal example code for a worker process

When a call to
[*worker.all_reduce*](https://github.com/tsirif/platoon/blob/feature/new-interface/platoon/worker.py#L297)
is made, the internal `pygpu.gpuarray.GpuArray`s are fetched and used as
arguments to the corresponding AllReduce collective operation in a local
**pygpu** GPU communicator world. This GPU comm world is local in a sense that
it is composed only of a single host's GPUs, in order to effectively utilize NVIDIA's
**NCCL** optimized framework. So we are expecting to have concurrent NCCL operations
for each host. When the pygpu collective has finished and we are having a
multi-node training procedure, a single worker out of the workers in each host
will copy the result from its GPU to a memory buffer in the host. This memory
buffer is shared (through the means of posix ipc) among all workers processes
in a host and their controller process. Then this worker requests from its
controller to execute the corresponding **MPI** collective operation with the
other controller processes in a inter-node MPI communicator world. The result
from this operation is received in the same shared buffer. When the MPI
operation has finished, all workers write back concurrently the result from the
shared buffer to the destination GpuArray in their GPUs.

> ```
> # Execute collective operation in local NCCL communicator world
> res = self._regional_comm.all_reduce(src, op, dest)
>
> # Create new shared buffer which corresponds to result GpuArray buffer
> if dest is None:
>     self.new_linked_shared(res)
> else:
>     if dest not in self.shared_arrays:
>         self.new_linked_shared(dest)
>     res = dest
> res_array = self.shared_arrays[res]
>
> self.lock()
> first = self.send_req("platoon-am_i_first")
> if first:
>     # Copy from GpuArray to shared memory buffer
>     internal_res.read(res_array)
>
>     # Request from controller to perform the same collective operation
>     # in MPI communicator world using shared memory buffer
>     self.send_req("platoon-all_reduce", info={'shmem': self._shmem_names[res],
>                                               'dtype': str(internal_res.dtype),
>                                               'op': op})
> self.unlock()
>
> # Concurrently copy from shared memory back to result GpuArray
> # after Controller has finished global collective operation
> internal_res.write(res_array)
>
> if dest is None:
>     return res
> ```
> Simplified code from Worker class demonstrating program flow

Right now, I am testing thoroughly this new interface. I am interested to see
the behavior of the system if an unexpected error occurs. I expect processes to
shut down as cleanly as possible. For the next steps, I would like to include
modules in **Platoon** which will allow creating a training and validating
procedure with ease through ready-to-use configurable classes of training parts.
This way **Platoon** will also provide a high-level gallery of reusable
training algorithms for multi-GPU/node systems.

> Till then, keep on coding  
> Tsirif
