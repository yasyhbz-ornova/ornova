import type { CatalogCategoryId } from "./catalog";

export type GalleryRender = { number: string; sourcePrefix: string; title: string; categoryId: CatalogCategoryId | null; status: "ready" | "duplicate" | "review"; duplicateOf?: string; needsCompleteView?: boolean; src: string; width: number; height: number };

export const galleryRenders: readonly GalleryRender[] = [
  {
    "number": "01",
    "sourcePrefix": "2ae32afd",
    "title": "سنجاق‌سینهٔ باریک",
    "categoryId": "brooches-pins",
    "status": "ready",
    "src": "/images/ornova/gallery/final-renders/01-2ae32afd.webp",
    "width": 661,
    "height": 1029
  },
  {
    "number": "02",
    "sourcePrefix": "28a58529",
    "title": "آویز دندان",
    "categoryId": "pendants",
    "status": "ready",
    "src": "/images/ornova/gallery/final-renders/02-28a58529.webp",
    "width": 662,
    "height": 1031
  },
  {
    "number": "03",
    "sourcePrefix": "5ba0f400",
    "title": "گوشوارهٔ عنکبوتی",
    "categoryId": "earrings",
    "status": "ready",
    "src": "/images/ornova/gallery/final-renders/03-5ba0f400.webp",
    "width": 670,
    "height": 1028
  },
  {
    "number": "04",
    "sourcePrefix": "5fd8f6b5",
    "title": "انگشتر مُهر گاو",
    "categoryId": "rings",
    "status": "ready",
    "needsCompleteView": true,
    "src": "/images/ornova/gallery/final-renders/04-5fd8f6b5.webp",
    "width": 994,
    "height": 608
  },
  {
    "number": "05",
    "sourcePrefix": "3a602d9e",
    "title": "انگشتر نگین‌دار",
    "categoryId": "rings",
    "status": "ready",
    "src": "/images/ornova/gallery/final-renders/05-3a602d9e.webp",
    "width": 1008,
    "height": 634
  },
  {
    "number": "06",
    "sourcePrefix": "4501ed69",
    "title": "تکرار تصویر ۰۴",
    "categoryId": "rings",
    "status": "duplicate",
    "duplicateOf": "04",
    "src": "/images/ornova/gallery/final-renders/06-4501ed69.webp",
    "width": 994,
    "height": 608
  },
  {
    "number": "07",
    "sourcePrefix": "7d31d155",
    "title": "سنجاق‌سینهٔ باریک",
    "categoryId": "brooches-pins",
    "status": "ready",
    "src": "/images/ornova/gallery/final-renders/07-7d31d155.webp",
    "width": 664,
    "height": 1036
  },
  {
    "number": "08",
    "sourcePrefix": "3f570c5c",
    "title": "آویز گل فیبوناچی",
    "categoryId": "pendants",
    "status": "ready",
    "src": "/images/ornova/gallery/final-renders/08-3f570c5c.webp",
    "width": 669,
    "height": 988
  },
  {
    "number": "09",
    "sourcePrefix": "bdf057dd",
    "title": "آویز گل فیبوناچی مرداد",
    "categoryId": "pendants",
    "status": "ready",
    "src": "/images/ornova/gallery/final-renders/09-bdf057dd.webp",
    "width": 669,
    "height": 986
  },
  {
    "number": "10",
    "sourcePrefix": "90a43642",
    "title": "آویز گل",
    "categoryId": "pendants",
    "status": "ready",
    "src": "/images/ornova/gallery/final-renders/10-90a43642.webp",
    "width": 668,
    "height": 1033
  },
  {
    "number": "11",
    "sourcePrefix": "100964b7",
    "title": "آویز گل دوبرگ",
    "categoryId": "pendants",
    "status": "ready",
    "src": "/images/ornova/gallery/final-renders/11-100964b7.webp",
    "width": 669,
    "height": 1036
  },
  {
    "number": "12",
    "sourcePrefix": "5afa9e2b",
    "title": "آویز گل دوبرگ",
    "categoryId": "pendants",
    "status": "ready",
    "src": "/images/ornova/gallery/final-renders/12-5afa9e2b.webp",
    "width": 670,
    "height": 1034
  },
  {
    "number": "13",
    "sourcePrefix": "e160ec1c",
    "title": "آویز گل زنگوله‌ای",
    "categoryId": "pendants",
    "status": "ready",
    "src": "/images/ornova/gallery/final-renders/13-e160ec1c.webp",
    "width": 672,
    "height": 1034
  },
  {
    "number": "14",
    "sourcePrefix": "8af3284b",
    "title": "نیم‌ست صورت فلکی آذر",
    "categoryId": "jewelry-sets",
    "status": "ready",
    "src": "/images/ornova/gallery/final-renders/14-8af3284b.webp",
    "width": 677,
    "height": 1036
  },
  {
    "number": "15",
    "sourcePrefix": "f1e14d13",
    "title": "انگشتر با نگین تیره",
    "categoryId": "rings",
    "status": "ready",
    "src": "/images/ornova/gallery/final-renders/15-f1e14d13.webp",
    "width": 1009,
    "height": 619
  },
  {
    "number": "16",
    "sourcePrefix": "10439ecf",
    "title": "نیم‌ست صورت فلکی اسفند",
    "categoryId": "jewelry-sets",
    "status": "ready",
    "src": "/images/ornova/gallery/final-renders/16-10439ecf.webp",
    "width": 721,
    "height": 1142
  },
  {
    "number": "17",
    "sourcePrefix": "506cd1ef",
    "title": "نیم‌ست خورشیدی",
    "categoryId": "jewelry-sets",
    "status": "ready",
    "src": "/images/ornova/gallery/final-renders/17-506cd1ef.webp",
    "width": 721,
    "height": 1142
  },
  {
    "number": "18",
    "sourcePrefix": "6b9ab99a",
    "title": "نشان مدور؛ سنجاق‌سینه",
    "categoryId": "brooches-pins",
    "status": "ready",
    "src": "/images/ornova/gallery/final-renders/18-6b9ab99a.webp",
    "width": 669,
    "height": 1031
  },
  {
    "number": "19",
    "sourcePrefix": "cc5bc68e",
    "title": "انگشتر مُهر با مینای تیره",
    "categoryId": "rings",
    "status": "ready",
    "needsCompleteView": true,
    "src": "/images/ornova/gallery/final-renders/19-cc5bc68e.webp",
    "width": 994,
    "height": 602
  },
  {
    "number": "20",
    "sourcePrefix": "916a01d1",
    "title": "دستبند حوت · اسفند",
    "categoryId": "bracelets",
    "status": "ready",
    "src": "/images/ornova/gallery/final-renders/20-916a01d1.webp",
    "width": 994,
    "height": 720
  },
  {
    "number": "21",
    "sourcePrefix": "989df897",
    "title": "گوشوارهٔ میخی نگین‌دار",
    "categoryId": "earrings",
    "status": "ready",
    "src": "/images/ornova/gallery/final-renders/21-989df897.webp",
    "width": 673,
    "height": 1030
  },
  {
    "number": "22",
    "sourcePrefix": "b92fbb99",
    "title": "گوشوارهٔ میخی برف‌گون",
    "categoryId": "earrings",
    "status": "ready",
    "src": "/images/ornova/gallery/final-renders/22-b92fbb99.webp",
    "width": 673,
    "height": 1029
  },
  {
    "number": "23",
    "sourcePrefix": "38ed1cf5",
    "title": "آویز گل فیبوناچی اسفند",
    "categoryId": "pendants",
    "status": "ready",
    "src": "/images/ornova/gallery/final-renders/23-38ed1cf5.webp",
    "width": 670,
    "height": 989
  },
  {
    "number": "24",
    "sourcePrefix": "6a9574f9",
    "title": "آویز گل فیبوناچی مهر",
    "categoryId": "pendants",
    "status": "ready",
    "src": "/images/ornova/gallery/final-renders/24-6a9574f9.webp",
    "width": 668,
    "height": 989
  },
  {
    "number": "25",
    "sourcePrefix": "7ac39b2e",
    "title": "آویز گل فیبوناچی فروردین",
    "categoryId": "pendants",
    "status": "ready",
    "src": "/images/ornova/gallery/final-renders/25-7ac39b2e.webp",
    "width": 669,
    "height": 989
  },
  {
    "number": "26",
    "sourcePrefix": "fde51f49",
    "title": "آویز گل فیبوناچی خرداد",
    "categoryId": "pendants",
    "status": "ready",
    "src": "/images/ornova/gallery/final-renders/26-fde51f49.webp",
    "width": 670,
    "height": 989
  },
  {
    "number": "27",
    "sourcePrefix": "1b15f65a",
    "title": "آویز گل فیبوناچی",
    "categoryId": "pendants",
    "status": "ready",
    "src": "/images/ornova/gallery/final-renders/27-1b15f65a.webp",
    "width": 669,
    "height": 988
  },
  {
    "number": "28",
    "sourcePrefix": "6e05b2bc",
    "title": "آویز گل فیبوناچی تیر",
    "categoryId": "pendants",
    "status": "ready",
    "src": "/images/ornova/gallery/final-renders/28-6e05b2bc.webp",
    "width": 669,
    "height": 989
  },
  {
    "number": "29",
    "sourcePrefix": "628823d7",
    "title": "آویز گل فیبوناچی آبان",
    "categoryId": "pendants",
    "status": "ready",
    "src": "/images/ornova/gallery/final-renders/29-628823d7.webp",
    "width": 670,
    "height": 989
  },
  {
    "number": "30",
    "sourcePrefix": "edb2c3ff",
    "title": "آویز گل فیبوناچی",
    "categoryId": "pendants",
    "status": "ready",
    "src": "/images/ornova/gallery/final-renders/30-edb2c3ff.webp",
    "width": 669,
    "height": 988
  },
  {
    "number": "31",
    "sourcePrefix": "c6a13e54",
    "title": "آویز گل فیبوناچی اردیبهشت",
    "categoryId": "pendants",
    "status": "ready",
    "src": "/images/ornova/gallery/final-renders/31-c6a13e54.webp",
    "width": 669,
    "height": 988
  },
  {
    "number": "32",
    "sourcePrefix": "85d9d26e",
    "title": "گوشوارهٔ آویز نگین‌دار",
    "categoryId": "earrings",
    "status": "ready",
    "src": "/images/ornova/gallery/final-renders/32-85d9d26e.webp",
    "width": 699,
    "height": 1029
  },
  {
    "number": "33",
    "sourcePrefix": "f70baa44",
    "title": "نیم‌ست صورت فلکی فروردین",
    "categoryId": "jewelry-sets",
    "status": "ready",
    "src": "/images/ornova/gallery/final-renders/33-f70baa44.webp",
    "width": 678,
    "height": 1036
  },
  {
    "number": "34",
    "sourcePrefix": "cde5f81d",
    "title": "نیم‌ست صورت فلکی سه‌شاخه",
    "categoryId": "jewelry-sets",
    "status": "ready",
    "src": "/images/ornova/gallery/final-renders/34-cde5f81d.webp",
    "width": 680,
    "height": 1037
  },
  {
    "number": "35",
    "sourcePrefix": "01b87d89",
    "title": "نیم‌ست صورت فلکی خرداد",
    "categoryId": "jewelry-sets",
    "status": "ready",
    "src": "/images/ornova/gallery/final-renders/35-01b87d89.webp",
    "width": 681,
    "height": 1036
  },
  {
    "number": "36",
    "sourcePrefix": "b3fd7fc3",
    "title": "نیم‌ست صورت فلکی تیر",
    "categoryId": "jewelry-sets",
    "status": "ready",
    "src": "/images/ornova/gallery/final-renders/36-b3fd7fc3.webp",
    "width": 680,
    "height": 1035
  },
  {
    "number": "37",
    "sourcePrefix": "c9073c1e",
    "title": "نیم‌ست صورت فلکی لوزی",
    "categoryId": "jewelry-sets",
    "status": "ready",
    "src": "/images/ornova/gallery/final-renders/37-c9073c1e.webp",
    "width": 681,
    "height": 1036
  },
  {
    "number": "38",
    "sourcePrefix": "5384e9f7",
    "title": "نیم‌ست صورت فلکی شهریور",
    "categoryId": "jewelry-sets",
    "status": "ready",
    "src": "/images/ornova/gallery/final-renders/38-5384e9f7.webp",
    "width": 680,
    "height": 1037
  },
  {
    "number": "39",
    "sourcePrefix": "4bd216d9",
    "title": "نیم‌ست صورت فلکی با آویز زاویه‌دار",
    "categoryId": "jewelry-sets",
    "status": "ready",
    "src": "/images/ornova/gallery/final-renders/39-4bd216d9.webp",
    "width": 680,
    "height": 1038
  },
  {
    "number": "40",
    "sourcePrefix": "6156af94",
    "title": "نیم‌ست صورت فلکی مهر",
    "categoryId": "jewelry-sets",
    "status": "ready",
    "src": "/images/ornova/gallery/final-renders/40-6156af94.webp",
    "width": 681,
    "height": 1038
  },
  {
    "number": "41",
    "sourcePrefix": "4c746a8e",
    "title": "نیم‌ست صورت فلکی آبان",
    "categoryId": "jewelry-sets",
    "status": "ready",
    "src": "/images/ornova/gallery/final-renders/41-4c746a8e.webp",
    "width": 677,
    "height": 1036
  },
  {
    "number": "42",
    "sourcePrefix": "c6efa868",
    "title": "نیم‌ست صورت فلکی بهمن",
    "categoryId": "jewelry-sets",
    "status": "ready",
    "src": "/images/ornova/gallery/final-renders/42-c6efa868.webp",
    "width": 680,
    "height": 1038
  },
  {
    "number": "43",
    "sourcePrefix": "e33d7f40",
    "title": "دستبند حَمَل · فروردین",
    "categoryId": "bracelets",
    "status": "ready",
    "src": "/images/ornova/gallery/final-renders/43-e33d7f40.webp",
    "width": 996,
    "height": 718
  },
  {
    "number": "44",
    "sourcePrefix": "b2a154ae",
    "title": "دستبند سرطان · تیر",
    "categoryId": "bracelets",
    "status": "ready",
    "src": "/images/ornova/gallery/final-renders/44-b2a154ae.webp",
    "width": 993,
    "height": 718
  },
  {
    "number": "45",
    "sourcePrefix": "feb7a8a0",
    "title": "دستبند ثور · اردیبهشت",
    "categoryId": "bracelets",
    "status": "ready",
    "src": "/images/ornova/gallery/final-renders/45-feb7a8a0.webp",
    "width": 996,
    "height": 720
  },
  {
    "number": "46",
    "sourcePrefix": "c304e541",
    "title": "دستبند جوزا · خرداد",
    "categoryId": "bracelets",
    "status": "ready",
    "src": "/images/ornova/gallery/final-renders/46-c304e541.webp",
    "width": 997,
    "height": 722
  },
  {
    "number": "47",
    "sourcePrefix": "a3aed3a8",
    "title": "دستبند سنبله · شهریور",
    "categoryId": "bracelets",
    "status": "ready",
    "src": "/images/ornova/gallery/final-renders/47-a3aed3a8.webp",
    "width": 996,
    "height": 721
  },
  {
    "number": "48",
    "sourcePrefix": "13dee177",
    "title": "دستبند دلو · بهمن",
    "categoryId": "bracelets",
    "status": "ready",
    "src": "/images/ornova/gallery/final-renders/48-13dee177.webp",
    "width": 994,
    "height": 719
  },
  {
    "number": "49",
    "sourcePrefix": "03fc240a",
    "title": "دستبند اسد · مرداد",
    "categoryId": "bracelets",
    "status": "ready",
    "src": "/images/ornova/gallery/final-renders/49-03fc240a.webp",
    "width": 996,
    "height": 720
  },
  {
    "number": "50",
    "sourcePrefix": "040f8e31",
    "title": "دستبند قوس · آذر",
    "categoryId": "bracelets",
    "status": "ready",
    "src": "/images/ornova/gallery/final-renders/50-040f8e31.webp",
    "width": 996,
    "height": 719
  },
  {
    "number": "51",
    "sourcePrefix": "21fbc57f",
    "title": "دستبند عقرب · آبان",
    "categoryId": "bracelets",
    "status": "ready",
    "src": "/images/ornova/gallery/final-renders/51-21fbc57f.webp",
    "width": 996,
    "height": 720
  },
  {
    "number": "52",
    "sourcePrefix": "98576685",
    "title": "دستبند میزان · مهر",
    "categoryId": "bracelets",
    "status": "ready",
    "src": "/images/ornova/gallery/final-renders/52-98576685.webp",
    "width": 996,
    "height": 720
  },
  {
    "number": "53",
    "sourcePrefix": "9c6e04f5",
    "title": "دستبند جدی · دی",
    "categoryId": "bracelets",
    "status": "ready",
    "src": "/images/ornova/gallery/final-renders/53-9c6e04f5.webp",
    "width": 995,
    "height": 721
  }
];

export const visibleGalleryRenders = galleryRenders.filter((render) => render.status === "ready" && render.categoryId && !render.needsCompleteView);
