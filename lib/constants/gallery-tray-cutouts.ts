type CropBounds = readonly [left: number, top: number, width: number, height: number];
type Cutout = { source: string; src: string; bounds: CropBounds };

// Each transparent WebP uses the original RGB pixels at these source coordinates.
const cutouts: Record<string, Cutout> = {
  "01": {
    source: "/images/ornova/gallery/final-renders/01-2ae32afd.webp",
    src: "/images/ornova/gallery/tray-cutouts/01-2ae32afd.webp",
    bounds: [161, 188, 355, 570],
  },
  "03": {
    source: "/images/ornova/gallery/final-renders/03-5ba0f400.webp",
    src: "/images/ornova/gallery/tray-cutouts/03-5ba0f400.webp",
    bounds: [108, 306, 466, 258],
  },
  "04": {
    source: "/images/ornova/gallery/final-renders/04-5fd8f6b5.webp",
    src: "/images/ornova/gallery/tray-cutouts/04-5fd8f6b5.webp",
    bounds: [252, 40, 492, 355],
  },
  "05": {
    source: "/images/ornova/gallery/final-renders/05-3a602d9e.webp",
    src: "/images/ornova/gallery/tray-cutouts/05-3a602d9e.webp",
    bounds: [270, 30, 465, 214],
  },
  "07": {
    source: "/images/ornova/gallery/final-renders/07-7d31d155.webp",
    src: "/images/ornova/gallery/tray-cutouts/07-7d31d155.webp",
    bounds: [301, 428, 72, 260],
  },
  "08": {
    source: "/images/ornova/gallery/final-renders/08-3f570c5c.webp",
    src: "/images/ornova/gallery/tray-cutouts/08-3f570c5c.webp",
    bounds: [288, 213, 257, 515],
  },
  "40": {
    source: "/images/ornova/gallery/final-renders/40-6156af94.webp",
    src: "/images/ornova/gallery/tray-cutouts/40-6156af94.webp",
    bounds: [65, 255, 549, 502],
  },
  "45": {
    source: "/images/ornova/gallery/final-renders/45-feb7a8a0.webp",
    src: "/images/ornova/gallery/tray-cutouts/45-feb7a8a0.webp",
    bounds: [73, 146, 856, 380],
  },
  "02": {
    source: "/images/ornova/gallery/final-renders/02-28a58529.webp",
    src: "/images/ornova/gallery/tray-cutouts/02-28a58529.webp",
    bounds: [210, 247, 251, 417],
  },
  "09": {
    source: "/images/ornova/gallery/final-renders/09-bdf057dd.webp",
    src: "/images/ornova/gallery/tray-cutouts/09-bdf057dd.webp",
    bounds: [296, 217, 243, 504],
  },
  "10": {
    source: "/images/ornova/gallery/final-renders/10-90a43642.webp",
    src: "/images/ornova/gallery/tray-cutouts/10-90a43642.webp",
    bounds: [244, 324, 182, 339],
  },
  "11": {
    source: "/images/ornova/gallery/final-renders/11-100964b7.webp",
    src: "/images/ornova/gallery/tray-cutouts/11-100964b7.webp",
    bounds: [256, 322, 163, 349],
  },
  "12": {
    source: "/images/ornova/gallery/final-renders/12-5afa9e2b.webp",
    src: "/images/ornova/gallery/tray-cutouts/12-5afa9e2b.webp",
    bounds: [264, 328, 160, 333],
  },
  "13": {
    source: "/images/ornova/gallery/final-renders/13-e160ec1c.webp",
    src: "/images/ornova/gallery/tray-cutouts/13-e160ec1c.webp",
    bounds: [250, 320, 178, 352],
  },
  "14": {
    source: "/images/ornova/gallery/final-renders/14-8af3284b.webp",
    src: "/images/ornova/gallery/tray-cutouts/14-8af3284b.webp",
    bounds: [66, 280, 543, 460],
  },
  "15": {
    source: "/images/ornova/gallery/final-renders/15-f1e14d13.webp",
    src: "/images/ornova/gallery/tray-cutouts/15-f1e14d13.webp",
    bounds: [256, 56, 495, 194],
  },
  "16": {
    source: "/images/ornova/gallery/final-renders/16-10439ecf.webp",
    src: "/images/ornova/gallery/tray-cutouts/16-10439ecf.webp",
    bounds: [66, 284, 586, 630],
  },
  "17": {
    source: "/images/ornova/gallery/final-renders/17-506cd1ef.webp",
    src: "/images/ornova/gallery/tray-cutouts/17-506cd1ef.webp",
    bounds: [66, 165, 586, 737],
  },
  "18": {
    source: "/images/ornova/gallery/final-renders/18-6b9ab99a.webp",
    src: "/images/ornova/gallery/tray-cutouts/18-6b9ab99a.webp",
    bounds: [130, 257, 414, 424],
  },
  "19": {
    source: "/images/ornova/gallery/final-renders/19-cc5bc68e.webp",
    src: "/images/ornova/gallery/tray-cutouts/19-cc5bc68e.webp",
    bounds: [246, 40, 500, 355],
  },
  "20": {
    source: "/images/ornova/gallery/final-renders/20-916a01d1.webp",
    src: "/images/ornova/gallery/tray-cutouts/20-916a01d1.webp",
    bounds: [75, 150, 846, 370],
  },
  "21": {
    source: "/images/ornova/gallery/final-renders/21-989df897.webp",
    src: "/images/ornova/gallery/tray-cutouts/21-989df897.webp",
    bounds: [194, 433, 289, 70],
  },
  "22": {
    source: "/images/ornova/gallery/final-renders/22-b92fbb99.webp",
    src: "/images/ornova/gallery/tray-cutouts/22-b92fbb99.webp",
    bounds: [134, 357, 420, 185],
  },
  "23": {
    source: "/images/ornova/gallery/final-renders/23-38ed1cf5.webp",
    src: "/images/ornova/gallery/tray-cutouts/23-38ed1cf5.webp",
    bounds: [294, 218, 248, 506],
  },
  "24": {
    source: "/images/ornova/gallery/final-renders/24-6a9574f9.webp",
    src: "/images/ornova/gallery/tray-cutouts/24-6a9574f9.webp",
    bounds: [293, 218, 247, 506],
  },
  "25": {
    source: "/images/ornova/gallery/final-renders/25-7ac39b2e.webp",
    src: "/images/ornova/gallery/tray-cutouts/25-7ac39b2e.webp",
    bounds: [294, 218, 247, 506],
  },
  "26": {
    source: "/images/ornova/gallery/final-renders/26-fde51f49.webp",
    src: "/images/ornova/gallery/tray-cutouts/26-fde51f49.webp",
    bounds: [294, 218, 248, 506],
  },
  "27": {
    source: "/images/ornova/gallery/final-renders/27-1b15f65a.webp",
    src: "/images/ornova/gallery/tray-cutouts/27-1b15f65a.webp",
    bounds: [293, 218, 248, 505],
  },
  "28": {
    source: "/images/ornova/gallery/final-renders/28-6e05b2bc.webp",
    src: "/images/ornova/gallery/tray-cutouts/28-6e05b2bc.webp",
    bounds: [294, 218, 247, 506],
  },
  "29": {
    source: "/images/ornova/gallery/final-renders/29-628823d7.webp",
    src: "/images/ornova/gallery/tray-cutouts/29-628823d7.webp",
    bounds: [294, 218, 247, 506],
  },
  "30": {
    source: "/images/ornova/gallery/final-renders/30-edb2c3ff.webp",
    src: "/images/ornova/gallery/tray-cutouts/30-edb2c3ff.webp",
    bounds: [294, 218, 248, 507],
  },
  "31": {
    source: "/images/ornova/gallery/final-renders/31-c6a13e54.webp",
    src: "/images/ornova/gallery/tray-cutouts/31-c6a13e54.webp",
    bounds: [294, 218, 247, 505],
  },
  "32": {
    source: "/images/ornova/gallery/final-renders/32-85d9d26e.webp",
    src: "/images/ornova/gallery/tray-cutouts/32-85d9d26e.webp",
    bounds: [90, 207, 519, 595],
  },
  "33": {
    source: "/images/ornova/gallery/final-renders/33-f70baa44.webp",
    src: "/images/ornova/gallery/tray-cutouts/33-f70baa44.webp",
    bounds: [65, 312, 545, 410],
  },
  "34": {
    source: "/images/ornova/gallery/final-renders/34-cde5f81d.webp",
    src: "/images/ornova/gallery/tray-cutouts/34-cde5f81d.webp",
    bounds: [65, 277, 546, 507],
  },
  "35": {
    source: "/images/ornova/gallery/final-renders/35-01b87d89.webp",
    src: "/images/ornova/gallery/tray-cutouts/35-01b87d89.webp",
    bounds: [65, 272, 548, 520],
  },
  "36": {
    source: "/images/ornova/gallery/final-renders/36-b3fd7fc3.webp",
    src: "/images/ornova/gallery/tray-cutouts/36-b3fd7fc3.webp",
    bounds: [65, 266, 547, 549],
  },
  "37": {
    source: "/images/ornova/gallery/final-renders/37-c9073c1e.webp",
    src: "/images/ornova/gallery/tray-cutouts/37-c9073c1e.webp",
    bounds: [66, 278, 547, 459],
  },
  "38": {
    source: "/images/ornova/gallery/final-renders/38-5384e9f7.webp",
    src: "/images/ornova/gallery/tray-cutouts/38-5384e9f7.webp",
    bounds: [67, 284, 545, 437],
  },
  "39": {
    source: "/images/ornova/gallery/final-renders/39-4bd216d9.webp",
    src: "/images/ornova/gallery/tray-cutouts/39-4bd216d9.webp",
    bounds: [65, 258, 547, 563],
  },
  "41": {
    source: "/images/ornova/gallery/final-renders/41-4c746a8e.webp",
    src: "/images/ornova/gallery/tray-cutouts/41-4c746a8e.webp",
    bounds: [66, 296, 543, 409],
  },
  "42": {
    source: "/images/ornova/gallery/final-renders/42-c6efa868.webp",
    src: "/images/ornova/gallery/tray-cutouts/42-c6efa868.webp",
    bounds: [65, 282, 547, 474],
  },
  "43": {
    source: "/images/ornova/gallery/final-renders/43-e33d7f40.webp",
    src: "/images/ornova/gallery/tray-cutouts/43-e33d7f40.webp",
    bounds: [75, 149, 848, 370],
  },
  "44": {
    source: "/images/ornova/gallery/final-renders/44-b2a154ae.webp",
    src: "/images/ornova/gallery/tray-cutouts/44-b2a154ae.webp",
    bounds: [75, 149, 845, 370],
  },
  "46": {
    source: "/images/ornova/gallery/final-renders/46-c304e541.webp",
    src: "/images/ornova/gallery/tray-cutouts/46-c304e541.webp",
    bounds: [75, 149, 849, 370],
  },
  "47": {
    source: "/images/ornova/gallery/final-renders/47-a3aed3a8.webp",
    src: "/images/ornova/gallery/tray-cutouts/47-a3aed3a8.webp",
    bounds: [74, 149, 849, 371],
  },
  "48": {
    source: "/images/ornova/gallery/final-renders/48-13dee177.webp",
    src: "/images/ornova/gallery/tray-cutouts/48-13dee177.webp",
    bounds: [75, 149, 846, 370],
  },
  "49": {
    source: "/images/ornova/gallery/final-renders/49-03fc240a.webp",
    src: "/images/ornova/gallery/tray-cutouts/49-03fc240a.webp",
    bounds: [75, 149, 848, 372],
  },
  "50": {
    source: "/images/ornova/gallery/final-renders/50-040f8e31.webp",
    src: "/images/ornova/gallery/tray-cutouts/50-040f8e31.webp",
    bounds: [75, 150, 848, 371],
  },
  "51": {
    source: "/images/ornova/gallery/final-renders/51-21fbc57f.webp",
    src: "/images/ornova/gallery/tray-cutouts/51-21fbc57f.webp",
    bounds: [75, 149, 848, 370],
  },
  "52": {
    source: "/images/ornova/gallery/final-renders/52-98576685.webp",
    src: "/images/ornova/gallery/tray-cutouts/52-98576685.webp",
    bounds: [75, 149, 847, 370],
  },
  "53": {
    source: "/images/ornova/gallery/final-renders/53-9c6e04f5.webp",
    src: "/images/ornova/gallery/tray-cutouts/53-9c6e04f5.webp",
    bounds: [75, 150, 847, 370],
  },
};

export function galleryTrayCutout(photo: { number: string; src: string }): Cutout | null {
  const cutout = Object.hasOwn(cutouts, photo.number) ? cutouts[photo.number] : undefined;
  return cutout?.source === photo.src ? cutout : null;
}

const originalLapisCutout = "/images/ornova/gallery/products/lajvard-shab-stand-cutout-preview-v1.webp";
const horizontalLapisCutout = "/images/ornova/gallery/products/lajvard-shab-tray-horizontal-v2.webp";

export function galleryTrayWorkImage(path: string) {
  return path === originalLapisCutout ? horizontalLapisCutout : path;
}
