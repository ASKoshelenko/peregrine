# ADR-0006: the calibration set is a versioned artifact

INT8 calibration membership is a deterministic, fingerprinted list inside the dataset
manifest. The export consumes exactly that list, and the run lineage records its hash —
a quantized model whose calibration set cannot be named is not reproducible.
