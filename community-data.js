// Original ZIOK records, preserved as the static and initial server baseline.
const ZIOK_COMMUNITY_DEFAULTS = {
  "businesses": [
    {
      "name": "Asian Star Market",
      "phone": "918-940-4799",
      "address": "8256 E 71st St, Tulsa, OK 74133",
      "category": "Markets"
    },
    {
      "name": "Cing Kim: Allstate Insurance",
      "phone": "918-209-7082",
      "address": "1909 W C St, Jenks, OK 74037",
      "category": "Professional services"
    },
    {
      "name": "CNC Nails & Spa",
      "phone": "918-994-7348",
      "address": "8064 S Memorial Dr, Tulsa, OK 74133",
      "category": "Beauty"
    },
    {
      "name": "CP Asian Market LLC",
      "phone": "918-859-7698",
      "address": "715 W Main St Suite W, Jenks, OK 74037",
      "category": "Markets"
    },
    {
      "name": "Dim's OK Nails & Spa",
      "phone": "918-957-5350",
      "address": "8222 E 71st St, Tulsa, OK 74133",
      "category": "Beauty"
    },
    {
      "name": "Eastland Food Market",
      "phone": "918-706-1658",
      "address": "1660 E 71st St Suite B, Tulsa, OK 74136",
      "category": "Markets"
    },
    {
      "name": "Grace Beauty Salon",
      "phone": "918-574-8431",
      "address": "6932 S Lewis Ave, Tulsa, OK 74136",
      "category": "Beauty"
    },
    {
      "name": "Hornbill Oriental Grocery",
      "phone": "918-794-0203",
      "address": "7282 S Lewis Ave, Tulsa, OK 74136",
      "category": "Markets"
    },
    {
      "name": "J&J Asian Market",
      "phone": "918-995-7644",
      "address": "13101 S Elwood Ave Suite E, Glenpool, OK 74033",
      "category": "Markets"
    },
    {
      "name": "JC Alterations at Mingo",
      "phone": "539-367-2256",
      "address": "10030 S Mingo Rd C, Tulsa, OK 74133",
      "category": "Fashion & repairs"
    },
    {
      "name": "KAI Burmese Cuisine",
      "phone": "918-408-6581",
      "address": "6912 S Lewis Ave, Tulsa, OK 74136",
      "category": "Restaurants"
    },
    {
      "name": "Kim Mung Auto & Tire Services",
      "phone": "",
      "address": "12522 E 21st St, Tulsa, OK 74129",
      "category": "Auto & home services"
    },
    {
      "name": "Laizom Asian Market",
      "phone": "918-949-5599",
      "address": "12141 S Elm St, Jenks, OK 74037",
      "category": "Markets"
    },
    {
      "name": "LD Asian Restaurant",
      "phone": "918-764-8207",
      "address": "6835 S Peoria Ave, Tulsa, OK 74136",
      "category": "Restaurants"
    },
    {
      "name": "Masago Sushi & Asian Bistro",
      "phone": "918-995-7142",
      "address": "397 E Main St, Jenks, OK 74037",
      "category": "Restaurants"
    },
    {
      "name": "OK Asian Market",
      "phone": "",
      "address": "6916 S Lewis Ave, Tulsa, OK 74136",
      "category": "Markets"
    },
    {
      "name": "Parami Shoe Repair and Alterations",
      "phone": "918-521-3106",
      "address": "8088 S Yale Ave A, Tulsa, OK 74136",
      "category": "Fashion & repairs"
    },
    {
      "name": "Shwe Myanmar Oriental Store",
      "phone": "918-863-4779",
      "address": "985 E 141st St, Glenpool, OK 74033",
      "category": "Markets"
    },
    {
      "name": "Sian Sik Asian Market",
      "phone": "918-734-9374",
      "address": "11462 S Union Ave B, Jenks, OK 74037",
      "category": "Markets"
    },
    {
      "name": "Sian Sushi Restaurant",
      "phone": "918-551-7645",
      "address": "3530 S Sheridan Rd, Tulsa, OK 74145",
      "category": "Restaurants"
    },
    {
      "name": "Sian Zuun Asian Market",
      "phone": "918-895-5540",
      "address": "6849 S Peoria Ave, Tulsa, OK 74136",
      "category": "Markets"
    },
    {
      "name": "Sura Korea Japanese Cuisine",
      "phone": "918-488-1887",
      "address": "6946 S Lewis Ave, Tulsa, OK 74136",
      "category": "Restaurants"
    },
    {
      "name": "Vaphual Asian Market",
      "phone": "",
      "address": "6006 S Sheridan Rd, Tulsa, OK 74145",
      "category": "Markets"
    },
    {
      "name": "Zodeih Asian Market",
      "phone": "918-856-9317",
      "address": "500 W A St, Jenks, OK 74037",
      "category": "Markets"
    },
    {
      "name": "Zogam Cafe",
      "phone": "918-551-7005",
      "address": "6930 S Lewis Ave, Tulsa, OK 74136",
      "category": "Restaurants"
    },
    {
      "name": "Zoheisa Asian Store",
      "phone": "918-584-8877",
      "address": "5920 S Lewis Ave, Tulsa, OK 74105",
      "category": "Markets"
    },
    {
      "name": "Zua Sian Sushi To Go",
      "phone": "918-350-9828",
      "address": "8011 S Sheridan Rd Suite E, Tulsa, OK 74133",
      "category": "Restaurants"
    },
    {
      "name": "Zua Lim Boutique",
      "phone": "",
      "address": "715 W Main St-C, Jenks, OK",
      "category": "Fashion & repairs"
    },
    {
      "name": "Freedom Equity Group",
      "phone": "",
      "address": "1660 E 71st St #2A, Tulsa, OK 74136",
      "category": "Professional services"
    },
    {
      "name": "Asian Star Cuisine",
      "phone": "918-252-5522",
      "address": "10030 S Mingo Rd, Tulsa, OK 74133",
      "category": "Restaurants"
    },
    {
      "name": "Myanmar Fashion USA LLC",
      "phone": "",
      "address": "517 W Main St, Jenks, OK",
      "category": "Fashion & repairs"
    },
    {
      "name": "Glory Fresh Market",
      "phone": "",
      "address": "12800 S Memorial Dr Suite H, Bixby, OK 74008",
      "category": "Markets"
    },
    {
      "name": "Khup Naulak Realtor",
      "phone": "918-496-3333",
      "address": "8909 S Yale Ave, Tulsa, OK 74137",
      "category": "Professional services"
    },
    {
      "name": "OKIE Heat and Cooling",
      "phone": "",
      "address": "1513 W 117th St S, Jenks, OK 74037",
      "category": "Auto & home services"
    },
    {
      "name": "Zomi Plumbling and Drain Cleaning",
      "phone": "918-887-4565",
      "address": "1711 W 117th Pl S, Jenks, OK 74037",
      "category": "Auto & home services"
    },
    {
      "name": "Kim Tax Service",
      "phone": "",
      "address": "9624 S 67th E Ave, Tulsa, OK 74133",
      "category": "Professional services"
    },
    {
      "name": "GPlus",
      "phone": "",
      "address": "",
      "category": "Other"
    },
    {
      "name": "Lun Cing Realtor",
      "phone": "",
      "address": "1302 S Florence Pl, Tulsa",
      "category": "Professional services"
    },
    {
      "name": "U Sound",
      "phone": "",
      "address": "",
      "category": "Other"
    },
    {
      "name": "MT Sound System Rental LLC",
      "phone": "",
      "address": "",
      "category": "Sound & events"
    },
    {
      "name": "ZoFi",
      "phone": "",
      "address": "",
      "category": "Other"
    },
    {
      "name": "Lydia Kim Tax Service",
      "phone": "",
      "address": "",
      "category": "Professional services"
    }
  ],
  "churches": [
    {
      "name": "Bethel EBC",
      "pastor": "Rev. Zam Cin Kap"
    },
    {
      "name": "Bethel UPC",
      "pastor": "Pastor Suan Go Cin"
    },
    {
      "name": "Bethel Worship Center",
      "pastor": "Rev. Kap Lian Tuang"
    },
    {
      "name": "EBC Tulsa",
      "pastor": "Rev. Lian Za Tuang"
    },
    {
      "name": "Far East Mission Church",
      "pastor": "Rev. Dr. Cin Khaw Kham"
    },
    {
      "name": "Full Gospel Assembly International",
      "pastor": "Rev. Dr. Dam Suan Mung"
    },
    {
      "name": "Full Life Church",
      "pastor": "Rev. Dr. Nang Khen Khup"
    },
    {
      "name": "Gateway International Church",
      "pastor": "Rev. Dr. Suan Za Lian"
    },
    {
      "name": "Hosanna Mission Church",
      "pastor": "Pastor Thawng Kim"
    },
    {
      "name": "Laipian Pasian Paaina Pawlpi",
      "pastor": "Pa Haupi"
    },
    {
      "name": "Myanmar Adventist Fellowship",
      "pastor": "Sia Lianno"
    },
    {
      "name": "Myanmar Christian Church",
      "pastor": "Rev. Dr. Kham Khan Khai"
    },
    {
      "name": "Myanmar Zomi Baptist Church",
      "pastor": "Pastor Hau Suan Khai"
    },
    {
      "name": "Shalom Baptist Church",
      "pastor": "Pastor Sangpi"
    },
    {
      "name": "St. Catherine of Alexandria",
      "pastor": "Father. Robert Kim Pu"
    },
    {
      "name": "Tulsa Baptist Church",
      "pastor": "Sia Paubawi"
    },
    {
      "name": "ZBCM of Tulsa",
      "pastor": "Rev. Dr. Ngo Suanthang Guite"
    },
    {
      "name": "Zomi SDA Tulsa",
      "pastor": "Pastor Thlenga"
    }
  ],
  "villages": [
    {
      "name": "Anlangh Innkuan Tulsa"
    },
    {
      "name": "Buan Innkuan Tulsa"
    },
    {
      "name": "Buanli Innkuan Tulsa"
    },
    {
      "name": "Cikha Innkuan Tulsa"
    },
    {
      "name": "Dalkhai Innkuan Tulsa"
    },
    {
      "name": "Dampi Innkuan Tulsa"
    },
    {
      "name": "Dimlo Innkuan Tulsa"
    },
    {
      "name": "Gamlai Innkuan Tulsa"
    },
    {
      "name": "Gawngmual Innkuan Tulsa"
    },
    {
      "name": "Guasing Innkuan Tulsa"
    },
    {
      "name": "Heilei Innkuan Tulsa"
    },
    {
      "name": "Kaptel Innkuan Tulsa"
    },
    {
      "name": "Khuadam Innkuan Tulsa"
    },
    {
      "name": "Khuano Innkuan Tulsa"
    },
    {
      "name": "Laangzang Innkuan Tulsa"
    },
    {
      "name": "Lailo Innkuan Tulsa"
    },
    {
      "name": "Lalta Innkuan Tulsa"
    },
    {
      "name": "Lamzang Innkuan Tulsa"
    },
    {
      "name": "Lezang Innkuan Tulsa"
    },
    {
      "name": "Mualbem Innkuan Tulsa"
    },
    {
      "name": "Mal Suangzang Innkuan Tulsa"
    },
    {
      "name": "Nahnuai Innkuan Tulsa"
    },
    {
      "name": "Tuithang Innkuan Tulsa"
    },
    {
      "name": "Pangzang Innkuan Tulsa"
    },
    {
      "name": "Phaileng Innkuan Tulsa"
    },
    {
      "name": "Phaiza Innkuan Tulsa"
    },
    {
      "name": "Pimpih Innkuan Tulsa"
    },
    {
      "name": "Pyidawtha Innkuan Tulsa"
    },
    {
      "name": "Saipimual Innkuan Tulsa"
    },
    {
      "name": "Saizang Innkuan Tulsa"
    },
    {
      "name": "Selbungh Innkuan Tulsa"
    },
    {
      "name": "Sezang Innkuan Tulsa"
    },
    {
      "name": "Suanghoih Innkuan Tulsa"
    },
    {
      "name": "Talek Innkuan Tulsa"
    },
    {
      "name": "Tauleng Innkuan Tulsa"
    },
    {
      "name": "Teeklui Innkuan Tulsa"
    },
    {
      "name": "Thalmual Innkuan Tulsa"
    },
    {
      "name": "Thangnuai Innkuan Tulsa"
    },
    {
      "name": "Thangzang Innkuan Tulsa"
    },
    {
      "name": "Tonzang Lawm Tulsa"
    },
    {
      "name": "Tualzang Innkuan Tulsa"
    },
    {
      "name": "Tuilangh Innkuan Tulsa"
    },
    {
      "name": "Tuimui Innkuan Tulsa"
    },
    {
      "name": "Tuipi Innkuan Tulsa"
    },
    {
      "name": "Tuitawh Innkuan Tulsa"
    },
    {
      "name": "Tungtuang Innkuan Tulsa"
    },
    {
      "name": "Tungzang Innkuan Tulsa"
    },
    {
      "name": "Vangteh Innkuan Tulsa"
    },
    {
      "name": "Zampi Innkuan Tulsa"
    }
  ],
  "terms": [
    {
      "label": "2024–2026"
    },
    {
      "label": "2026–2028"
    }
  ],
  "leadership": [
    {
      "term": "2024–2026",
      "name": "Cin Hatlang",
      "nickname": "Mangsen",
      "role": "Chairman",
      "kind": "Officer"
    },
    {
      "term": "2024–2026",
      "name": "Tual Pau",
      "nickname": "Pautawng Hatlang",
      "role": "Vice Chairman",
      "kind": "Officer"
    },
    {
      "term": "2024–2026",
      "name": "Mangpi Jasuan",
      "nickname": "Mangpi",
      "role": "Secretary",
      "kind": "Officer"
    },
    {
      "term": "2024–2026",
      "name": "Dim Cing",
      "nickname": "Lun Cing",
      "role": "Assistant Secretary",
      "kind": "Officer"
    },
    {
      "term": "2024–2026",
      "name": "Dim Nuam",
      "nickname": "Nuampi",
      "role": "Treasurer",
      "kind": "Officer"
    },
    {
      "term": "2024–2026",
      "name": "Kham Niang",
      "nickname": "Niangniang",
      "role": "Assistant Treasurer",
      "kind": "Officer"
    },
    {
      "term": "2024–2026",
      "name": "Tuang Gualnam",
      "nickname": "Lianbawi",
      "role": "Director of Genvai",
      "kind": "Director"
    },
    {
      "term": "2024–2026",
      "name": "Andrew Nun",
      "nickname": "Nunpi",
      "role": "Director of Sports",
      "kind": "Director"
    },
    {
      "term": "2024–2026",
      "name": "Dal Kham",
      "nickname": "Khampu",
      "role": "Director of Media",
      "kind": "Director"
    },
    {
      "term": "2024–2026",
      "name": "Suan Lun",
      "nickname": "Suihlun",
      "role": "Assistant Director of Music",
      "kind": "Director"
    },
    {
      "term": "2024–2026",
      "name": "Thang Piang",
      "nickname": "Sb Tungpi",
      "role": "Assistant Director of Genvai",
      "kind": "Director"
    },
    {
      "term": "2024–2026",
      "name": "Cin Zang",
      "nickname": "Cyi Zang",
      "role": "Public Relations",
      "kind": "Director"
    },
    {
      "term": "2024–2026",
      "name": "Sian Niang",
      "nickname": "Mingmawi",
      "role": "Director of Music",
      "kind": "Director"
    },
    {
      "term": "2024–2026",
      "name": "Lun Siam",
      "nickname": "Siamnu",
      "role": "Assistant Director of Media",
      "kind": "Director"
    }
  ],
  "documents": [
    {
      "type": "constitution",
      "noteEn": "",
      "noteZo": ""
    },
    {
      "type": "bylaws",
      "noteEn": "",
      "noteZo": ""
    }
  ]
};
if (typeof module !== "undefined") module.exports = ZIOK_COMMUNITY_DEFAULTS;
