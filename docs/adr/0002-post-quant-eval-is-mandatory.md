# ADR-0002: a converted model is a new model

The release gate evaluates post-quantization artifacts per target. A PyTorch checkpoint passing eval does not imply the TFLite INT8 or TensorRT artifact is safe to ship.
