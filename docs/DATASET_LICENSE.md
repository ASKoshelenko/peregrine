# Dataset license record

## Selected dataset

- Dataset: Mamgistics, version 1
- Creator: Raja Sekar
- Publisher: Roboflow Universe
- Source: https://universe.roboflow.com/raja-sekar-mrubn/mamgistics/dataset/1
- Source declaration: `License: CC BY 4.0`
- SPDX identifier: `CC-BY-4.0`
- License: https://creativecommons.org/licenses/by/4.0/
- Verified: 2026-08-14

Attribution text:

> Mamgistics Dataset by Raja Sekar, published through Roboflow Universe, licensed under CC BY 4.0.

The selected v1 export contains 1,034 images: 945 train, 78 validation, and 11 test. Its bundled
Roboflow record reports Auto-Orient, resize to 640x640 (Stretch), and no augmentation. Peregrine
records format conversion (including polygon-to-bounding-box conversion), class mapping,
split/subset selection, and other modifications alongside the DVC snapshot. Raw images and
annotations are not committed to Git.

The versioned `warehouse-assets-2-v1` label space maps `boxes` to `carton`, and both `pallet` and
`pallets` to `pallet`. This is an adaptation for the warehouse asset-tracking demo and is recorded
as a modification under CC BY.

## Citation supplied by the source

```bibtex
@misc{mamgistics_dataset,
  title = {Mamgistics Dataset},
  type = {Open Source Dataset},
  author = {Raja Sekar},
  howpublished = {https://universe.roboflow.com/raja-sekar-mrubn/mamgistics},
  journal = {Roboflow Universe},
  publisher = {Roboflow},
  year = {2022},
  month = {nov}
}
```

CC BY 4.0 requires attribution, a license link, and an indication of modifications when shared.
This record is an engineering compliance gate, not legal advice.
