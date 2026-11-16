import Image from "next/image";
import type { CSSProperties } from "react";
import type { GalleryRoomStand } from "@/lib/constants/gallery-room";
import type { GalleryRoomSample } from "@/lib/constants/gallery-room-samples";
import styles from "./GalleryRoom.module.css";

/** Display the owner's original final photo through the matching empty stand silhouette. */
export function GalleryStandSurface({ stand, sample }: { stand: GalleryRoomStand; sample?: GalleryRoomSample }) {
  if (!sample) return null;
  const [bx, by, bw, bh] = stand.bounds;
  const [iw, ih] = stand.image;
  const [x, y, width, height] = sample.bounds;
  const ringPhoto = stand.categoryId === "rings" && sample.number === "05";
  const mask = ringPhoto ? undefined : {
    maskImage: `url(/images/ornova/gallery/stands/${stand.asset})`,
    maskSize: `${iw / bw * 100}% ${ih / bh * 100}%`,
    maskPosition: `${bx / (iw - bw) * 100}% ${by / (ih - bh) * 100}%`,
  } as CSSProperties;
  return <span className={`${styles.productSurface}${ringPhoto ? ` ${styles.ringPhotoSurface}` : ""}`} style={mask}>
    <Image key={sample.number} src={sample.src} alt={sample.title} data-gallery-product-number={sample.number} width={sample.image[0]} height={sample.image[1]} sizes="(max-width: 800px) 80vw, 500px" className={styles.productLayer} style={{ width: `${sample.image[0] / width * 100}%`, height: `${sample.image[1] / height * 100}%`, left: `${-x / width * 100}%`, top: `${-y / height * 100}%` }} />
  </span>;
}
