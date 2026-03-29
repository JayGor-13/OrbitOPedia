/**
 * Rocket Controller
 *
 * Serves the rocket database. The same data that powers the frontend gallery
 * (script_rockets.js) is seeded here so the backend and frontend always agree
 * on rocket identifiers and field names.
 *
 * When MongoDB is available the data lives in the database; otherwise the
 * bundled ROCKET_DATA array is used as an in-process fallback.
 */

const Rocket = require("../models/Rocket");
const mongoose = require("mongoose");

// ── Seed data – mirrors script_rockets.js in the frontend ────────────────────
// Field names use camelCase to match the Mongoose schema; the controller maps
// them back to the hyphenated names the frontend expects before responding.

const ROCKET_DATA = [
  {
    rocketId: "001",
    name: "Falcon 9",
    org: "SpaceX",
    status: "Active",
    image: "/Rockets/Falcon9.jpg",
    images: [
      "https://cdn.mos.cms.futurecdn.net/4XiA59LTWoSiBdFP7oqhY-1200-80.jpg",
      "https://rocketstem.b-cdn.net/wp-content/uploads/2020/11/EmvV4u1UcAAnvjg.jpeg",
      "https://media.wired.com/photos/5a7cb68fa2d3835392e1b469/4:3/w_2133,h_1600,c_limit/spacexrocketreturn.jpg",
    ],
    content:
      "Falcon 9 is a partially reusable two-stage-to-orbit launch vehicle designed and manufactured by SpaceX in the United States. Both the first and second stages are powered by Merlin engines, using cryogenic liquid oxygen and rocket-grade kerosene (RP-1) as propellants. Unlike most rockets in service, which are expendable launch systems, Falcon 9 is partially reusable.<br><br>The first stage is capable of re-entering the atmosphere and landing vertically after separating from the second stage. First-stage landings can occur either back at the launch site or downrange on droneships. In addition to the first stage, Falcon 9's payload fairing is also reusable. The payload fairing halves utilize a parafoil to steer themselves toward a recovery vessel.",
    missions: 324, successes: 321, partialFailures: 1, failures: 2, successStreak: 295, successRate: 99.2,
    price: 67, height: 70, leo: 22800, gto: 8300, thrust: 7607, stages: 2, strapOns: 0, fairingDiameter: 5.2, fairingHeight: 13,
  },
  {
    rocketId: "002",
    name: "Alpha",
    org: "Firefly",
    status: "Active",
    image: "/Rockets/alpha.jpg",
    images: [
      "https://i0.wp.com/spacenews.com/wp-content/uploads/2021/09/alpha-prelaunch.jpg?fit=879%2C495&ssl=1",
      "https://assets.newatlas.com/dims4/default/db9a356/2147483647/strip/true/crop/4000x2250+0+0/resize/2880x1620!/quality/90/?url=http%3A%2F%2Fnewatlas-brightspot.s3.amazonaws.com%2Farchive%2Ffirefly-alpha.jpeg",
      "https://www.eoportal.org/ftp/satellite-missions/f/firefly-alpha-04012022/FireflyAlpha_Auto7.jpeg",
    ],
    content:
      "Alpha is a two-stage expendable vehicle developed by Firefly Aerospace to service the commercial small satellite launch market, as well as rapid response missions for national security payloads. It is primarily targeted towards dedicated missions but offers rideshare options as well.<br><br>Alpha's first stage is powered by four Reaver engines burning kerolox in a tap-off cycle. The second stage has a single Lightning engine utilizing the same fuel and cycle type.",
    missions: 4, successes: 1, partialFailures: 2, failures: 1, successStreak: 0, successRate: 50,
    price: 15, height: 29.48, leo: 1030, gto: 0, thrust: 801, stages: 2, strapOns: 0, fairingDiameter: 2.2, fairingHeight: 5.0,
  },
  {
    rocketId: "003",
    name: "Ariane 5",
    org: "ESA",
    status: "Retired",
    image: "/Rockets/Ariane5.jpg",
    images: [
      "https://upload.wikimedia.org/wikipedia/commons/4/4f/Ariane_5_with_James_Webb_Space_Telescope_Prelaunch_%2851773093465%29.jpg",
      "https://www.spacequip.eu/wp-content/uploads/2023/07/Ariane-5.jpg",
      "https://www.esa.int/var/esa/storage/images/esa_multimedia/images/2022/12/mtg-i1_heads_for_orbit/24622853-3-eng-GB/MTG-I1_heads_for_orbit_pillars.png",
    ],
    content:
      'Ariane 5 was a European heavy-lift space launch vehicle developed and operated by Arianespace for the European Space Agency (ESA). It was launched from the Centre Spatial Guyanais in French Guiana. It has been used to deliver payloads into geostationary transfer orbit (GTO) or low Earth orbit (LEO).<br><br>Since its first launch, Ariane 5 has been refined in successive versions: "G", "G+", "GS", "ECA", and most recently, "ES". The system has a commonly used dual-launch capability, where up to two large geostationary belt communication satellites can be mounted using a SYLDA (Système de Lancement Double Ariane, "Ariane Double-Launch System") carrier system.',
    missions: 117, successes: 112, partialFailures: 3, failures: 2, successStreak: 20, successRate: 97,
    price: 200, height: 53, leo: 21000, gto: 10500, thrust: 15120, stages: 2, strapOns: 2, fairingDiameter: 5.4, fairingHeight: 17.0,
  },
  {
    rocketId: "004",
    name: "Atlas V",
    org: "ULA",
    status: "Active",
    image: "/Rockets/AtlasV.webp",
    images: [
      "https://assets.aboutamazon.com/dims4/default/b6f3910/2147483647/strip/false/crop/1920x1080+0+0/resize/1200x675!/quality/90/?url=https%3A%2F%2Famazon-blogs-brightspot.s3.amazonaws.com%2Fd5%2Fde%2F25830dc840beb5f7c3c418d12d37%2Famazoninspace.jpg",
      "https://cdn.arstechnica.net/wp-content/uploads/2023/09/53178039780_335b0de75b_k-800x533.jpg",
      "https://www.ulalaunch.com/images/default-source/default-album/atlasv_5m_generic_exp_side_551.jpg?sfvrsn=2e2e3607_0",
    ],
    content:
      "Atlas V is an expendable launch system and the fifth major version in the Atlas rocket family. It was originally designed by Lockheed Martin, now being operated by United Launch Alliance (ULA), a joint venture between Lockheed and Boeing. Each Atlas V rocket consists of two main stages.<br><br>The first stage is powered by a Russian RD-180 engine manufactured by RD Amross and burning kerosene and liquid oxygen. The Centaur upper stage is powered by one or two United States RL10 engine(s) manufactured by Aerojet Rocketdyne and burning liquid hydrogen and liquid oxygen. AJ-60A strap-on solid rocket boosters (SRBs) have been used in some configurations, but are being phased out in favor of GEM-63 SRBs.",
    missions: 99, successes: 98, partialFailures: 1, failures: 0, successStreak: 89, successRate: 99.5,
    price: 153, height: 62.2, leo: 18850, gto: 8900, thrust: 12141, stages: 2, strapOns: 5, fairingDiameter: 5.4, fairingHeight: 26.5,
  },
  {
    rocketId: "005",
    name: "Electron",
    org: "Rocket Lab",
    status: "Active",
    image: "/Rockets/Electron.jpg",
    images: [
      "https://room.eu.com/images/contents/ElectronRocketRocketLab.jpg",
      "https://techcrunch.com/wp-content/uploads/2019/11/EKM2M7VVAAAx8CU.jpeg",
      "https://image.cnbcfm.com/api/v1/image/107273637-1689774231074-53053886666_48b37e1c40_k.jpg?v=1698267633&w=929&h=523&vtcrop=y",
    ],
    content:
      "Electron is a partially recoverable orbital launch vehicle developed by Rocket Lab, an American aerospace company founded in New Zealand with a wholly-owned New Zealand subsidiary. Electron was developed to service the commercial small satellite launch market. Its Rutherford engines are the first electric-pump-fed engine to power an orbital-class rocket. On some missions, the first stage is recovered using a parachute.",
    missions: 46, successes: 42, partialFailures: 0, failures: 4, successStreak: 5, successRate: 91.3,
    price: 7.5, height: 18, leo: 320, gto: 0, thrust: 224, stages: 2, strapOns: 0, fairingDiameter: 1.2, fairingHeight: 4.05,
  },
  {
    rocketId: "006",
    name: "PSLV",
    org: "ISRO",
    status: "Active",
    image: "https://upload.wikimedia.org/wikipedia/commons/7/7c/PSLV_C-35_at_the_launch_pad_%28cropped%29.jpg",
    images: [
      "https://www.isro.gov.in/media_isro/image/index/PSLVC55/PSLVC55_gallery/post_launch/MRM_8510.jpg.webp",
      "https://spaceflightnow.com/wp-content/uploads/2019/12/ELgOFZHU4AAChJ_.jpeg",
      "https://www.india.com/wp-content/uploads/2020/11/pslv.jpg",
    ],
    content:
      "The Polar Satellite Launch Vehicle (PSLV) is an expendable medium-lift launch vehicle designed and operated by the Indian Space Research Organisation (ISRO). It was developed to allow India to launch its Indian Remote Sensing (IRS) satellites into sun-synchronous orbits, a service that was, until the advent of the PSLV in 1993, commercially available only from Russia. PSLV can also launch small size satellites into Geostationary Transfer Orbit (GTO).",
    missions: 60, successes: 57, partialFailures: 1, failures: 2, successStreak: 19, successRate: 95.8,
    price: 31, height: 44, leo: 3250, gto: 1410, thrust: 7661, stages: 4, strapOns: 6, fairingDiameter: 3.2, fairingHeight: 8.3,
  },
  {
    rocketId: "007",
    name: "Saturn V",
    org: "NASA",
    status: "Retired",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/16/Apollo_11_Launch_-_GPN-2000-000630.jpg/1200px-Apollo_11_Launch_-_GPN-2000-000630.jpg",
    images: [
      "https://cdn.mos.cms.futurecdn.net/H4Cf4WhkLg5moYmHw7wZ4K.jpg",
      "https://assets.newatlas.com/dims4/default/b91cc9a/2147483647/strip/true/crop/1024x683+0+67/resize/1200x800!/quality/90/?url=http%3A%2F%2Fnewatlas-brightspot.s3.amazonaws.com%2Farchive%2Fsaturn-v-40.jpg",
      "https://evergreene.com/wp-content/uploads/2018/12/one-pager-1-4014c1bc12-original.jpg",
    ],
    content:
      "Saturn V was an American super heavy-lift launch vehicle certified for human-rating used by NASA. It consisted of three stages, each fueled by liquid propellants. It was developed to support the Apollo program for human exploration of the Moon and was later used to launch Skylab, the first American space station.<br><br>The Saturn V was launched 13 times from Kennedy Space Center with no loss of crew or payload. As of 2021, the Saturn V remains the tallest, heaviest, and most powerful (highest total impulse) rocket ever brought to operational status, and holds records for the heaviest payload launched and largest payload capacity to low Earth orbit (LEO) of 310,000 lb (140,000 kg), which included the third stage and unburned propellant needed to send the Apollo command and service module and Lunar Module to the Moon.",
    missions: 13, successes: 12, partialFailures: 1, failures: 0, successStreak: 11, successRate: 96.2,
    price: 1160, height: 110.6, leo: 140000, gto: 0, thrust: 35100, stages: 3, strapOns: 0, fairingDiameter: 0, fairingHeight: 0,
  },
  {
    rocketId: "008",
    name: "Antares",
    org: "Northrop Grumman",
    status: "Retired",
    image: "https://upload.wikimedia.org/wikipedia/commons/1/1b/Cropped_NG-11_Launch.jpg",
    images: [
      "https://assets3.cbsnewsstatic.com/hub/i/r/2023/08/01/89142ba1-cc0f-4caf-a08b-3809da88765d/thumbnail/640x338/0dce854f14a2a0f762c340c423bf1c2b/080123-ng19-stacking.jpg?v=8f9acb0830ce2ef2593f1d92f65cccba",
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSeTKHfn6loAJBw17cODlrdv_3hbuwsw-dkxWXsswiDPQ&s",
      "https://cdn.mos.cms.futurecdn.net/pxUp5sbm2GTbjpxLPzBTZ5.jpg",
    ],
    content:
      "Antares, known during early development as Taurus II, is an expendable launch system developed by Orbital Sciences Corporation (now part of Northrop Grumman) and the Yuzhnoye Design Bureau to launch the Cygnus spacecraft to the International Space Station as part of NASA's Commercial Resupply Services (CRS) program.",
    missions: 18, successes: 17, partialFailures: 0, failures: 1, successStreak: 13, successRate: 94.4,
    price: 85.0, height: 42.5, leo: 8000, gto: 0, thrust: 3844, stages: 2, strapOns: 0, fairingDiameter: 3.9, fairingHeight: 9.9,
  },
  {
    rocketId: "009",
    name: "Ariane 4",
    org: "ESA",
    status: "Retired",
    image: "https://upload.wikimedia.org/wikipedia/commons/9/9f/Ariane42P_rocket.png",
    images: [
      "https://www.ariane.group/wp-content/uploads/2017/05/v124.jpg",
      "https://spaceflight101.com/wp-content/uploads/2016/09/20874entrypc.jpg",
      "https://www.esa.int/var/esa/storage/images/esa_multimedia/images/2001/06/ariane_4_special/9117142-5-eng-GB/Ariane_4_special_pillars.jpg",
    ],
    content:
      'The Ariane 4 was a European expendable space launch system, developed by the Centre National d\'Études Spatiales (CNES), the French space agency, for the European Space Agency (ESA).<br><br>In 1982, the Ariane 4 program was approved by ESA. Drawing heavily upon the preceding Ariane 3, it was designed to provide a launcher capable of delivering heavier payloads and at a lower cost per kilogram than the earlier members of the Ariane family. The Ariane 4 was principally an evolution of the existing technologies used, as opposed to being revolutionary in its design ethos; this approach quickly gained the backing of most ESA members, who funded and participated in its development and operation. Capable of being equipped with a wide variety of strap-on boosters, the Ariane 4 gained a reputation for being an extremely versatile launcher.',
    missions: 116, successes: 113, partialFailures: 0, failures: 3, successStreak: 74, successRate: 97.4,
    price: 85.0, height: 58.72, leo: 5000, gto: 2000, thrust: 3034, stages: 3, strapOns: 0, fairingDiameter: 3.8, fairingHeight: "No Data",
  },
  {
    rocketId: "010",
    name: "SLS",
    org: "NASA",
    status: "Active",
    image: "https://www.dlr.de/en/images/2022/02/nasa-sls-rocket/@@images/image-2000-4aff3ac6de6e846e0b837cb5c0f5d555.jpeg",
    images: [
      "https://media.wired.com/photos/6374919bafd174dfb5859666/master/pass/Artemis-1-SLS-Launch-Science.jpg",
      "https://cdn.geekwire.com/wp-content/uploads/2017/06/170629-sls-flight.jpg",
      "https://upload.wikimedia.org/wikipedia/commons/b/b9/Artist_concept_of_the_SLS_Block_1_configuration.jpg",
    ],
    content:
      "The Space Launch System (SLS) is an American Space Shuttle-derived super heavy-lift expendable launch vehicle, which has been under development by NASA in the United States since its announcement in 2011. It has become the primary launch vehicle of NASA's deep space exploration plans including the planned crewed lunar flights of the Artemis program to the Moon and a possible follow-on human mission to Mars.",
    missions: 1, successes: 1, partialFailures: 0, failures: 0, successStreak: 1, successRate: 100,
    price: 876.0, height: 98.1, leo: 95000, gto: 0, thrust: 39440, stages: 2, strapOns: 2, fairingDiameter: 5.1, fairingHeight: 14.3,
  },
  {
    rocketId: "011",
    name: "Delta IV Heavy",
    org: "ULA",
    status: "Retired",
    image: "https://upload.wikimedia.org/wikipedia/commons/e/e3/45th_SW_Launches_Delta_IV-Heavy.jpg",
    images: [
      "https://cdn.mos.cms.futurecdn.net/DE3FdFAqbYDDyyNdhD743k.jpeg",
      "https://bloximages.chicago2.vip.townnews.com/syvnews.com/content/tncms/assets/v3/editorial/2/97/2979971f-df81-5b2f-ab15-b93a12b17c75/632913db8a1b6.preview.jpg?crop=1439%2C1079%2C95%2C0&resize=1439%2C1079&order=crop%2Cresize",
      "https://cdn.mos.cms.futurecdn.net/22F65JH2PyqpHKE9eWrA8m.jpg",
    ],
    content:
      "The Delta IV Heavy consists of a central Common Booster Core (CBC), with two additional CBCs as liquid rocket boosters instead of the GEM-60 solid rocket motors used by the Delta IV Medium+ versions. Each CBC uses a single RS-68 engine. The Delta IV Heavy uses the same Delta Cryogenic Second Stage (DCSS) as the Delta IV Medium+ rockets.<br><br>The rocket is currently being phased out in favor of United Launch Alliance's Vulcan rocket, which offers more competitive pricing for the same capability.",
    missions: 16, successes: 15, partialFailures: 1, failures: 0, successStreak: 15, successRate: 96.9,
    price: 350.0, height: 72, leo: 28370, gto: 13810, thrust: 9411, stages: 2, strapOns: 2, fairingDiameter: 5.1, fairingHeight: 19.1,
  },
  {
    rocketId: "012",
    name: "Delta IV Medium",
    org: "ULA",
    status: "Retired",
    image: "https://upload.wikimedia.org/wikipedia/commons/3/3e/Delta_IV_Medium_4.2%2B_%28with_GOES-N%29_on_launch_pad.jpg",
    images: [
      "https://www.ulalaunch.com/images/default-source/default-album/deltaiv_54_expanded51f10d03651f456eac99457c623dbb6a.jpg?sfvrsn=122a13e3_0",
      "https://cdn.wccftech.com/wp-content/uploads/2016/12/Delta-IV.jpg",
      "https://itmunch.com/wp-content/uploads/2019/08/ULA-Launches-Delta-IV-Medium-Rocket%E2%80%99s-Final-Flight-2.jpg",
    ],
    content:
      "While the Delta IV retains the name of the Delta family of rockets, major changes were incorporated. Perhaps the most significant change was the switch from kerosene to liquid hydrogen fuel, with new tankage and a new engine required.<br><br>The Delta IV Medium (Delta 9040) was the most basic Delta IV. It featured a single CBC and a modified Delta III second stage, with 4-meter liquid hydrogen and liquid oxygen tanks (called a Delta Cryogenic Second Stage (DCSS)) and a 4-meter payload fairing.",
    missions: 29, successes: 29, partialFailures: 0, failures: 0, successStreak: 29, successRate: 100,
    price: 133.0, height: 66.4, leo: 11600, gto: 6890, thrust: 6653, stages: 2, strapOns: 4, fairingDiameter: 5.1, fairingHeight: 19.1,
  },
  {
    rocketId: "013",
    name: "Proton-K",
    org: "Roscosmos",
    status: "Retired",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8b/Proton-K-Zarya.jpg/800px-Proton-K-Zarya.jpg",
    images: [
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTZIR3ppuVRnkM1umcVAPCMRwZHxTzpS6Ld-M6OksPuCg&s",
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRx6IgE1phf0WBhIZsnUEXmso8FQDqewZvY-v1kpc0q9A&s",
      "https://www.thespacetechie.com/wp-content/uploads/2021/07/ur500kl1s-1.jpg",
    ],
    content:
      "The Proton-K, also designated Proton 8K82K after its GRAU index, 8K82K, was a Russian, previously Soviet, carrier rocket derived from the earlier Proton. The baseline Proton-K was a three-stage rocket. Thirty were launched in this configuration, with payloads including all of the Soviet Union's Salyut space stations, all Mir modules with the exception of the Docking Module, which was launched on the United States Space Shuttle, and the Zarya and Zvezda modules of the International Space Station.",
    missions: 310, successes: 275, partialFailures: 2, failures: 33, successStreak: 19, successRate: 89.0,
    price: 90.0, height: 54.54, leo: 1900, gto: 2200, thrust: 9548, stages: 4, strapOns: 0, fairingDiameter: 4.35, fairingHeight: 13.2,
  },
  {
    rocketId: "014",
    name: "Proton-M",
    org: "Roscosmos",
    status: "Active",
    image: "https://upload.wikimedia.org/wikipedia/commons/1/14/Proton_Zvezda_crop.jpg",
    images: [
      "https://cdn.mos.cms.futurecdn.net/QkB3SqMosNTPL4hGGFWvi7.jpg",
      "https://static.dw.com/image/19012996_605.jpg",
      "https://www.russianspaceweb.com/images/rockets/proton/proton_m/stage_design_silo_1.jpg",
    ],
    content:
      "The Proton-M, GRAU index 8K82M or 8K82KM, is an expendable Russian heavy-lift launch vehicle derived from the Soviet-developed Proton. In a typical mission, a Proton-M is accompanied by a Briz-M upper stage. The Proton-M launches the orbital unit (that is: the payload, the payload adapter, and the Briz-M) into a slightly suborbital trajectory.",
    missions: 115, successes: 103, partialFailures: 4, failures: 8, successStreak: 3, successRate: 91.3,
    price: 65.0, height: 57.24, leo: 21000, gto: 6000, thrust: 10027, stages: 4, strapOns: 0, fairingDiameter: 4.35, fairingHeight: 10.0,
  },
  {
    rocketId: "015",
    name: "Angara A5",
    org: "Roscosmos",
    status: "Active",
    image: "https://www.theweek.in/content/dam/week/week/web-stories/current-affairs/images/2024/4/14/Angara-A5%20russian%20rocket%20reuters.jpg",
    images: [
      "https://cloudfront-us-east-2.images.arcpublishing.com/reuters/HT6XXVX6XZJSNFL3RI7QYHSIVU.jpg",
      "https://storage.googleapis.com/afs-prod/media/217fd1f65c74480c89014d46d3ec017e/3000.jpeg",
      "https://i.ndtvimg.com/mt/2014-12/Russia_rocket_Angara_650.jpg",
    ],
    content:
      "Angara A5 is a Russian heavy lift launch vehicle which consists of one URM-1 core and four URM-1 boosters, a 3.6m URM-2 second stage, and an upper stage, either the Briz-M, Blok DM-03 or the KVTK. Weighing 773 tonnes at lift-off, Angara A5 has a payload capacity of 24.5 tonnes to a 200 km (120 mi) x 60° orbit.",
    missions: 4, successes: 3, partialFailures: 0, failures: 1, successStreak: 1, successRate: 75.0,
    price: 100.0, height: 55.4, leo: 25000, gto: 3000, thrust: 9610, stages: 2, strapOns: 4, fairingDiameter: 4.35, fairingHeight: 15.2,
  },
  {
    rocketId: "016",
    name: "Falcon Heavy",
    org: "SpaceX",
    status: "Active",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/60/Falcon-heavy-crop.jpg/800px-Falcon-heavy-crop.jpg",
    images: [
      "https://cdn.mos.cms.futurecdn.net/fnfyE7cDwV9JWCopNK8Ycb-1200-80.jpg",
      "https://cdn.arstechnica.net/wp-content/uploads/2023/10/53222357916_daaa0f4356_k.jpg",
      "https://cdn.arstechnica.net/wp-content/uploads/2023/10/52634879837_e09b4a6aa3_k-800x533.jpg",
    ],
    content:
      "Falcon Heavy is a partially reusable heavy-lift launch vehicle designed and manufactured by SpaceX. It is derived from the Falcon 9 vehicle and consists of a strengthened Falcon 9 first stage as the center core with two additional Falcon 9-like first stages as strap-on boosters. Falcon Heavy is currently the 2nd most powerful operational rocket behind SLS.",
    missions: 9, successes: 9, partialFailures: 0, failures: 0, successStreak: 9, successRate: 100.0,
    price: 97.0, height: 70.0, leo: 63800, gto: 26700, thrust: 22819, stages: 2, strapOns: 2, fairingDiameter: 5.2, fairingHeight: 13.0,
  },
  {
    rocketId: "017",
    name: "Long March 2D",
    org: "SAST",
    status: "Active",
    image: "/Rockets/LongMarch2D.jpg",
    images: [
      "https://news.cgtn.com/news/2021-06-11/China-launches-four-satellites-onboard-a-Long-March-2D-rocket-110h8HNtQ0E/img/ff1cf88cb70a4f43b3301775b969938b/ff1cf88cb70a4f43b3301775b969938b.jpeg",
      "https://images.firstpost.com/wp-content/uploads/2020/06/1548px-Long_March_2D_launching_VRSS-1_afar-1.jpg",
      "https://obj.shine.cn/files/2020/06/12/3c2c9ea0-1111-4a07-9156-a1136a905637_0.jpg",
    ],
    content:
      "The Long March 2D, also known as the Chang Zheng 2D, CZ-2D and LM-2D, is a Chinese orbital carrier rocket. Manufactured by the Shanghai Academy of Spaceflight Technology (SAST), the Long March 2D is a 2-stage carrier rocket mainly used for launching LEO and SSO satellites.",
    missions: 88, successes: 87, partialFailures: 1, failures: 0, successStreak: 56, successRate: 99.4,
    price: 30.0, height: 40.77, leo: 3500, gto: 1200, thrust: 2962, stages: 3, strapOns: 0, fairingDiameter: 3.35, fairingHeight: 7.82,
  },
  {
    rocketId: "018",
    name: "Soyuz-U",
    org: "Roscosmos",
    status: "Retired",
    image: "https://upload.wikimedia.org/wikipedia/commons/b/b6/Soyuz_18_booster.jpg",
    images: [
      "https://cdn.mos.cms.futurecdn.net/RipkGecYVsXXruhBKvqDoW.jpg",
      "https://spaceflight101.com/progress-ms-05/wp-content/uploads/sites/142/2017/02/32203375674_9c24eca0c9_k_d.jpg",
      "https://c02.purpledshub.com/uploads/sites/48/2020/02/Soyuz_rocket-f701940.jpg",
    ],
    content:
      "The Soyuz-U launch vehicle was an improved version of the original Soyuz rocket. Soyuz-U was part of the R-7 family of rockets based on the R-7 Semyorka missile. Members of this rocket family were designed by the TsSKB design bureau and constructed at the Progress factory in Samara, Russia (now a united company, TsSKB-Progress). Soyuz-U was in use continuously for almost 44 years.",
    missions: 859, successes: 835, partialFailures: 2, failures: 22, successStreak: 1, successRate: 97.3,
    price: 40.0, height: 51.32, leo: 7150, gto: 0, thrust: 4693, stages: 3, strapOns: 4, fairingDiameter: 3.0, fairingHeight: 15.59,
  },
];

// ── Helper: map DB / seed record to the JSON shape expected by the frontend ──
function toFrontendShape(r) {
  return {
    id: r.rocketId,
    name: r.name,
    org: r.org,
    status: r.status,
    image: r.image,
    images: r.images,
    content: r.content,
    missions: r.missions,
    successes: r.successes,
    "partial failures": r.partialFailures,
    failures: r.failures,
    "success streak": r.successStreak,
    "success rate": r.successRate,
    price: r.price,
    height: r.height,
    leo: r.leo,
    gto: r.gto,
    thrust: r.thrust,
    stages: r.stages,
    "strap-ons": r.strapOns,
    "fairing diameter": r.fairingDiameter,
    "fairing height": r.fairingHeight,
  };
}

// ── Helper: get rockets from DB or seed data ─────────────────────────────────
async function getRockets() {
  const dbConnected = mongoose.connection.readyState === 1;

  if (dbConnected) {
    const count = await Rocket.countDocuments();
    if (count === 0) {
      // Seed the database with bundled data
      await Rocket.insertMany(ROCKET_DATA, { ordered: false }).catch((err) => {
        console.warn("Rocket DB seed warning:", err.message);
      });
    }
    return (await Rocket.find().lean()).map(toFrontendShape);
  }

  // No DB – return bundled data directly
  return ROCKET_DATA.map(toFrontendShape);
}

// ── Controllers ──────────────────────────────────────────────────────────────

/**
 * GET /api/rockets
 * Returns all 18 rockets. Supports optional ?status= and ?org= filters.
 */
async function getAllRockets(req, res, next) {
  try {
    let rockets = await getRockets();

    const { status, org } = req.query;
    if (status) {
      rockets = rockets.filter(
        (r) => r.status.toLowerCase() === status.toLowerCase()
      );
    }
    if (org) {
      rockets = rockets.filter((r) =>
        r.org.toLowerCase().includes(org.toLowerCase())
      );
    }

    res.json(rockets);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/rockets/:id
 * Returns a single rocket by its id (e.g. "001").
 */
async function getRocketById(req, res, next) {
  try {
    const rockets = await getRockets();
    const rocket = rockets.find((r) => r.id === req.params.id);

    if (!rocket) {
      return res.status(404).json({ error: `Rocket with id ${req.params.id} not found` });
    }

    res.json(rocket);
  } catch (err) {
    next(err);
  }
}

module.exports = { getAllRockets, getRocketById };
