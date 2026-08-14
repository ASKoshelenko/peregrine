# Dataset license record

## Selected dataset

- Dataset: Warehouse Pallet Dataset, version 1
- Creator: Industrial Inspection
- Publisher: Roboflow Universe
- Source: https://universe.roboflow.com/industrial-inspection/warehouse-pallet/dataset/1
- Source declaration: `License: CC BY 4.0`
- SPDX identifier: `CC-BY-4.0`
- License: https://creativecommons.org/licenses/by/4.0/
- Verified: 2026-08-13

Attribution text:

> Warehouse Pallet Dataset by Industrial Inspection, published through Roboflow Universe, licensed under CC BY 4.0.

The selected v1 source reports 790 images: 550 train, 160 validation, and 80 test. Roboflow
reports Auto-Orient preprocessing and no augmentation for this version. Peregrine will record
format conversion, class mapping, split/subset selection, and any other modifications alongside
the DVC snapshot. Raw images and annotations are not committed to Git.

The versioned `warehouse-assets-2-v1` label space maps boxes, cartons, packages, damaged boxes,
and open boxes to `carton`; `pallets` to `pallet`; and explicitly ignores `Barcode`. This is an
adaptation for the warehouse asset-tracking demo and is recorded as a modification under CC BY.

## Citation supplied by the source

```bibtex
@misc{warehouse-pallet_dataset,
  title = {Warehouse Pallet Dataset},
  type = {Open Source Dataset},
  author = {Industrial Inspection},
  howpublished = {https://universe.roboflow.com/industrial-inspection/warehouse-pallet},
  journal = {Roboflow Universe},
  publisher = {Roboflow},
  year = {2024},
  month = {feb}
}
```

CC BY 4.0 requires attribution, a license link, and an indication of modifications when shared.
This record is an engineering compliance gate, not legal advice.
