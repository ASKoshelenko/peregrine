# ADR-0007: target ids name arch × runtime × precision, not the execution substrate

`arm64_tflite_int8` stays the same row whether it is measured in a container, under QEMU,
or someday on a physical device; the run's provenance block records the actual host and
lane (reference / trend / laboratory). Renaming a target every time the substrate improves
would break lineage for zero information gain.
