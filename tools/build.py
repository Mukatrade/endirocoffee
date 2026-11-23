#!/usr/bin/env python3
"""Builds the static pages of the Endiro Coffee concept site.
Run: python3 tools/build.py   (writes *.html at the site root)
All facts come from endirocoffee.com (Nov 2026), its 2024 menus and blog,
bcorporation.net and the press named in README.md. Unknown facts show as [to confirm]."""
import json, html, os, re, urllib.parse

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CSS_V = "1"
SQ = "https://images.squarespace-cdn.com/content/v1/5c1af8961aef1dce259843fc/"

# Photos from endirocoffee.com. Remote ones load from Endiro's own image host.
# Run tools/localize-images.sh to copy them into img/ before a real launch.
REMOTE = {
    "path": "1570895625348-J22JN48T0J7NJ0PNBER5/Bukalasi-1-4.jpg",
    "cherries": "1626718717854-H4GGYBL4VIAPYSH38ISB/coffee+tree-square.jpeg",
    "cup": "1620246498609-LCCGC3MGKUK6CA5SWVXE/IMG_20190516_083821.jpg",
    "sorting": "1655333471718-S14YBXBMMURO7PQH61UH/PXL_20211115_084056802.PORTRAIT.jpg",
    "weighing": "1790001770444-5UX6T0ZQ2HMXXH9R8T76/IMG-20230131-WA0007.jpg",
    "green": "1619715936705-S54LH7PHD3QTYZ99PXII/IMG_20210114_153623.jpg",
    "sipi-view": "1633553109829-9MESW8QJER2YJY9179HQ/image-asset.jpeg",
    "sipi-falls": "1632760659586-O94EMLWE2HZXBLVC6O7Y/image-asset.jpeg",
    "growers": "1547162871217-C1WWCF8HHUA9GRWL17JN/tumblr_ozdq0ytH4Q1u5ec8mo1_1280.jpg",
    "beehive": "1547163062285-YSVE7DR57OQTORXVIE2W/Screen+Shot+2019-01-10+at+17.30.40.png",
    "muyenga": "1550801599733-NHKH9FXFD5GPWFFGC3CN/muyenga+front.jpg",
    "mbale": "1550801506311-RFRXGX4WGG266MTVDTBN/Mbale+Front.jpg",
    "sipi-cafe": "17f276ab-c955-4f79-8922-44e5e164baf8/Endiro+Coffee+Sipi+Falls.jpg",
    "robots": "1793027426290-3ZERWOKI4RQRWNSPL948/Untitled+design.png",
    "nakasero": "201126d2-8dcf-47fc-9438-db1c96c275ab/endiro+nakasero+academy+location+%281%29.jpg",
}
LOCAL = {"team": "img/team.jpg", "academy": "img/academy-class.jpg", "kisimenti": "img/kisimenti.jpg",
         "bags": "img/bags.jpg", "latte": "img/latte.jpg"}

def src(key, w=1500):
    if key in LOCAL: return LOCAL[key]
    if os.path.exists(os.path.join(ROOT, "img", "remote", key + ".jpg")): return f"img/remote/{key}.jpg"
    return SQ + REMOTE[key] + f"?format={w}w"

# Real pixel sizes, so every photo shows whole at its own shape (no cropping).
DIMS = {"team": (1436, 958), "academy": (1450, 958), "kisimenti": (1702, 958), "bags": (1230, 958), "latte": (1232, 958),
        "path": (1500, 1000), "cherries": (1200, 1200), "cup": (1156, 867), "sorting": (1500, 1125), "weighing": (1500, 999),
        "green": (867, 867), "sipi-view": (1440, 1440), "sipi-falls": (480, 480), "growers": (1280, 960), "beehive": (1200, 846),
        "muyenga": (768, 768), "mbale": (550, 413), "sipi-cafe": (1000, 562), "nakasero": (1000, 562)}

def img(key, alt, cls="photo", w=1500, eager=False, wh=None):
    lazy = "" if eager else ' loading="lazy" decoding="async"'
    wh = DIMS.get(key, wh or (1500, 1000))
    return f'<img class="{cls}" src="{src(key, w)}" alt="{html.escape(alt)}" width="{wh[0]}" height="{wh[1]}"{lazy}>'

def smart(s):
    s = re.sub(r'"([^"]*)"', "\u201c\\1\u201d", s)
    return re.sub(r"(\w)'(\w)", "\\1\u2019\\2", s)

def e(s): return html.escape(smart(s), quote=True)

def gmap(q, z=15):
    return "https://maps.google.com/maps?q=" + urllib.parse.quote_plus(q) + f"&z={z}&output=embed"

NAV = [("menu.html", "Menu"), ("coffee.html", "Our coffee"), ("about.html", "Our story"),
       ("academy.html", "Academy"), ("cafes.html", "Cafés"), ("journal.html", "Journal")]

def page(name, title, desc, body, scripts=(), styles=()):
    cur = ' aria-current="page"'
    nav = "".join(f'<a href="{h}"{cur if h == name else ""}>{t}</a>' for h, t in NAV)
    drawer = "".join(f'<a href="{h}">{t}</a>' for h, t in NAV + [("careers.html", "Careers"), ("wholesale.html", "Wholesale"), ("menu.html", "Order now")])
    js = "".join(f'<script src="js/{s}?v={CSS_V}" defer></script>' for s in ("site.js",) + tuple(scripts))
    extra_css = "".join(f'<link rel="stylesheet" href="css/{s}?v={CSS_V}">' for s in styles)
    return f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{e(title)}</title>
<meta name="description" content="{e(desc)}">
<meta property="og:title" content="{e(title)}">
<meta property="og:description" content="{e(desc)}">
<meta property="og:image" content="img/team.jpg">
<meta name="theme-color" content="#3A1E12">
<link rel="icon" href="img/logo-black.png">
<link rel="preload" href="fonts/hepta-slab-latin-wght-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="fonts/chivo-latin-wght-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="css/site.css?v={CSS_V}">{extra_css}
</head>
<body>
<a class="skip" href="#main">Skip to the content</a>
<header class="masthead night">
  <div class="wrap">
    <a class="brand" href="index.html" aria-label="Endiro Coffee, home"><img src="img/logo-white.png" alt="Endiro Coffee" width="52" height="48"></a>
    <nav class="nav" aria-label="Main">{nav}</nav>
    <a class="cart" href="menu.html" data-cart-count>Your order</a>
    <a class="btn btn-light order-btn" href="menu.html">Order now</a>
    <details class="menu-toggle"><summary>Menu</summary><nav class="drawer" aria-label="Mobile">{drawer}</nav></details>
  </div>
  <div class="mikeka" aria-hidden="true"></div>
</header>
<main id="main">
{body}
</main>
<footer class="foot night">
  <div class="mikeka" aria-hidden="true"></div>
  <div class="wrap">
    <div class="cols">
      <div class="stack-s">
        <img src="img/logo-white.png" alt="Endiro Coffee" width="88" height="81" style="width:88px;height:auto">
        <p class="motto">Brew all the good you can.</p>
        <p class="small">Endiro Ltd., Kampala, Uganda. Certified B Corp since 2019.</p>
      </div>
      <div><p class="fh">Visit</p><ul><li><a href="cafes.html">Cafés and hours</a></li><li><a href="menu.html">Menu and order</a></li><li><a href="cafes.html#map">Map</a></li></ul></div>
      <div><p class="fh">Endiro</p><ul><li><a href="about.html">Our story</a></li><li><a href="coffee.html">Our coffee</a></li><li><a href="academy.html">Endiro Academy</a></li><li><a href="journal.html">Journal</a></li></ul></div>
      <div><p class="fh">Work with us</p><ul><li><a href="careers.html">Careers</a></li><li><a href="careers.html#internship">Internships</a></li><li><a href="wholesale.html">Wholesale</a></li><li><a href="mailto:contact@endirocoffee.com">contact@endirocoffee.com</a></li><li><a href="https://www.instagram.com/endirocoffee">Instagram</a></li><li><a href="https://www.facebook.com/EndiroAurora/">Facebook</a></li></ul></div>
    </div>
    <div class="base"><span>Concept redesign for Endiro Coffee. Not yet the official site.</span><span>Photos: Endiro Coffee</span></div>
  </div>
</footer>
{js}
</body>
</html>
'''

def phead(crumb, h1, lead):
    return f'''<section class="phead"><div class="wrap"><p class="crumbs"><a href="index.html">Home</a> / {e(crumb)}</p><h1>{e(h1)}</h1><p class="lead">{lead}</p></div></section>'''

# ---------- data ----------
B = json.load(open(os.path.join(ROOT, "data", "branches-src.json")))["branches"]
PHOTO_OF = {"muyenga": "muyenga", "kisimenti": "kisimenti", "nakasero": "nakasero", "mbale": "mbale", "sipi": "sipi-cafe"}
for b in B:
    b["q"] = "Endiro Coffee, " + b["address"] + ", Uganda"
    b["photo"] = src(PHOTO_OF[b["id"]], 500) if b["id"] in PHOTO_OF else ""
    b["tel"] = "tel:" + b["phone"].replace(" ", "")
    b["dir"] = "https://www.google.com/maps/dir/?api=1&destination=" + urllib.parse.quote_plus(b["q"])
    b["embed"] = gmap(b["q"])
    if b["id"] == "nakasero":
        b["note"] = "The Academy page names a new space at The Orchid, McKinnon Road [to confirm]."
json.dump([{k: b[k] for k in ("id", "name", "address", "phone", "hours", "area")} for b in B],
          open(os.path.join(ROOT, "data", "branches.json"), "w"), ensure_ascii=False)

POSTS = [
    ("The Robots are Coming for Your Coffee: AI, Automation and the Future of Cafés", "/endirocoffee/2026/10/26/the-robots-are-coming-for-your-coffee", "2026-10-26", "October 26, 2026", src("robots", 750), "The start of a series on technology, automation and AI in cafés. It begins with an automatic espresso tamper and a barista who does not like it."),
    ("Coffee is Getting So Expensive, But at Least the Farmers are Finally Getting Paid. Right?", "/endirocoffee/2026/9/21/coffee-is-getting-so-expensive-but-at-least-the-farmers-are-finally-getting-paid-right", "2026-09-21", "September 21, 2026", src("weighing", 750), "Coffee costs more in the shop. This article asks why high exchange prices do not always reach the farmer."),
    ("The Glorious Cup of Bukalasi Coffee", "/endirocoffee/2021/5/5/the-glorious-cup-of-bukalasi-coffee", "2021-05-05", "May 5, 2021", src("cup", 750), "Why Endiro started its own farmer groups in 2015, and the facts and tasting notes of the Bukalasi coffee."),
    ("Climate Change and the Future of Coffee: Infographic", "/endirocoffee/2022/6/16/climate-change-and-the-future-of-coffee-infographic", "2022-06-16", "June 16, 2022", "", ""),
    ("Does Good Coffee Have a Future?", "/endirocoffee/2022/6/15/does-good-coffee-have-a-future", "2022-06-15", "June 15, 2022", "", ""),
    ("Becoming a Local Coffeeshop: 3 Strategies that Apply to You and Yours", "/endirocoffee/2021/5/19/becoming-a-local-coffeeshop-3-strategies-that-apply-to-you-and-yours", "2021-05-19", "May 19, 2021", "", ""),
    ("Sick Waves, Bruh: The Four Waves of Coffee Roasting", "/endirocoffee/2021/4/29/sick-waves-bruh-the-four-waves-of-coffee-roasting", "2021-04-29", "April 29, 2021", "", ""),
    ("Conflict Resistant Crops: Defined", "/endirocoffee/2021/4/21/conflict-resistant-crops-defined", "2021-04-21", "April 21, 2021", "", ""),
    ("Final Report: Bukalasi Landslide Relief", "/endirocoffee/2019/1/11/final-report-bukalasi-landslide-relief", "2019-01-11", "January 11, 2019", "", ""),
    ("Bukalasi Landslide Relief", "/endirocoffee/bukalasi-landslide-relief", "2018-10-18", "October 18, 2018", "", ""),
    ("Brewing all the Good We Can: 2018 Endiro Growers Farm Report", "/endirocoffee/brewing-all-the-good-we-can-2018-endiro-growers", "2018-08-21", "August 21, 2018", "", ""),
    ("Endiro Iganga is open again", "/endirocoffee/endiro-iganga-is-open-again-thats-right", "2018-02-20", "February 20, 2018", "", ""),
    ("I Am Not Poor, But My Head Is Poor: A 2017 Report on Endiro Growers Bukalasi", "/endirocoffee/i-am-not-poor-but-my-head-is-poor-a-2017-report", "2017-11-13", "November 13, 2017", "", ""),
    ("Bee keeping and coffee farming are a perfect match", "/endirocoffee/bee-keeping-and-coffee-farming-are-a-perfect", "2017-01-11", "January 11, 2017", "", ""),
    ("Looking to brew a better world in Iganga", "/endirocoffee/looking-to-brew-a-better-world-in-iganga-we-are", "2017-01-05", "January 5, 2017", "", ""),
    ("Top nine coffee shops in Uganda", "/endirocoffee/we-are-thrilled-to-see-that-the-lonely-planet-one", "2016-10-17", "October 17, 2016", "", ""),
    ("Improving the quality of our coffee", "/endirocoffee/just-over-a-year-ago-we-began-working-alongside", "2016-10-08", "October 8, 2016", "", ""),
    ("Child vulnerability", "/endirocoffee/at-endiro-coffee-our-vision-is-to-be-a-company", "2016-09-25", "September 25, 2016", "", ""),
    ("End of season", "/endirocoffee/our-first-season-of-coffee-growing-has-come-to-a", "2016-09-13", "September 13, 2016", "", ""),
    ("Cold brew", "/endirocoffee/brewed-in-an-icy-fridge-for-12-hours-our", "2016-06-14", "June 14, 2016", "", ""),
    ("Mentoring", "/endirocoffee/mentoring-is-a-core-value-for-us-at-endiro-we", "2016-05-15", "May 15, 2016", "", ""),
    ("The women of Bukalasi", "/endirocoffee/the-women-of-bukalasi-have-done-an-incredible-job", "2016-05-08", "May 8, 2016", "", ""),
]
ORIG = "https://www.endirocoffee.com"

def post_card(p, h="h-280"):
    t, u, iso, d, im, s = p
    pic = f'<img src="{im if ("?" in im or not im.startswith("http")) else im + "?format=750w"}" alt="" loading="lazy" decoding="async" width="750" height="500">' if im else ""
    summ = f'<p class="muted small">{e(s)}</p>' if s else ""
    return f'<a class="post" href="{ORIG}{u}">{pic}<time datetime="{iso}">{d}</time><h3>{e(t)}</h3>{summ}<span class="link">Read the article</span></a>'

MENU_TABS = json.load(open(os.path.join(ROOT, "data", "menu-preview.json")))

NEAREST = "https://www.google.com/maps/search/?api=1&query=" + urllib.parse.quote_plus("Endiro Coffee Uganda")

def finder_bar(label="Find a café"):
    return f'''<div class="finder-bar">
  <label class="f search"><span>{label}</span><input type="search" data-q placeholder="Café name or town, for example Entebbe" autocomplete="off"></label>
  <div class="chips" role="group" aria-label="Filter cafés">
    <button class="chip" type="button" aria-pressed="true" data-filter="all">All 18</button>
    <button class="chip" type="button" aria-pressed="false" data-filter="Kampala">Kampala</button>
    <button class="chip" type="button" aria-pressed="false" data-filter="up">Entebbe and upcountry</button>
  </div>
  <a class="btn btn-main" href="{NEAREST}" target="_blank" rel="noopener" data-nearest>Nearest Endiro</a>
</div>
<p class="small muted" data-count aria-live="polite">18 cafés</p>'''

def finder_cards():
    out = ""
    for b in B:
        out += f'''<li class="fcafe" data-cafe data-area="{e(b["area"])}" data-text="{e((b["name"] + " " + b["address"] + " " + b["area"]).lower())}">
  <h3>{e(b["name"])}</h3><p class="small muted">{e(b["hours"])}</p>
  <div class="fact"><a class="btn btn-line btn-s" href="{b["dir"]}" target="_blank" rel="noopener" data-nav>Navigate</a><a class="tlink" href="menu.html?cafe={b["id"]}">Order here</a></div>
</li>'''
    return f'<ul class="flist" role="list">{out}</ul><p class="note" data-none hidden>No café matches. Try a town name, or see <a href="cafes.html">all cafés</a>.</p>'

LOGOS = [
 # key, squarespace path, name (alt), link, group  (from endirocoffee.com, Nov 2026)
 ("lg-bcorp", "1626732064809-8OHGB2J7VWGNA7NBAUNU/Bcorp.jpg", "Certified B Corporation", "https://www.bcorporation.net/en-us/find-a-b-corp/company/endiro-coffee", "ug"),
 ("lg-sca", "1626811663259-VGPDW4FYRB6PPP6P9DR5/SCA_Primary_Stone_RGB1.png", "Specialty Coffee Association", "https://sca.coffee/", "ug"),
 ("lg-sofi", "1655924868954-38KLVXHM4142ZSGFDQK2/sofi-2022_newproduct-badge+%281%29.jpg", "sofi Awards 2022, New Product, Uganda Bududa Bukalasi coffee", "https://shopspecialtyfood.balluun.com/en-us/product/708a03121271bff4a144f5af29816cbc/endiro-coffee-uganda-bududa-bukalasi-100-washed-arabia-coffee", "ug"),
 ("lg-sme", "1678892458771-SM5CTJC700DQR85G7FEE/2023+SME+Committed+Badge+2+%281%29.png", "SME Climate Hub, committed 2023", "https://smeclimatehub.org/committed-businesses/?search=endiro%20coffee", "ug"),
 ("lg-absa", "1626813799832-ZN05BJRNVJZ4YWUN7839/AwardAbsa.jpeg", "Absa", "https://www.absa.africa/world-economic-forum/africa/clients/endiro-coffee/", "ug"),
 ("lg-rotary", "1674424652437-K3PTI3OM2JGRVG529YBE/rotary+award+kampala.jpeg", "Rotary Club of Kampala City award", "https://twitter.com/RotaryKlaCity/status/1616013779195543552", "ug"),
 ("lg-ta-kampala", "1626813346703-K3IITR5L3GKT5960ETJB/TAaward.jpg", "Tripadvisor Certificate of Excellence 2018, Endiro Kampala", "https://www.tripadvisor.com/Restaurant_Review-g293841-d2270452-Reviews-Endiro_Coffee-Kampala_Central_Region.html", "ug"),
 ("lg-unaa", "1626812874414-MXP3BQKNB6QFGKM32KWJ/unaa.jpeg", "Uganda North American Association", "https://unaaonline.org/", "ug"),
 ("lg-sfa", "1626979269817-A6Y1XR5ZEAC6IDQ3ENS7/bitmap.png", "Specialty Food Association", "https://www.specialtyfood.com/organization/301280/endiro-coffee-llc/", "us"),
 ("lg-nsba", "1626813311893-4ZKAPREL1MBZ8PL9GE5G/NSBA.jpg", "National Small Business Association", "https://nsba.biz/about-us/", "us"),
 ("lg-nextdoor", "1692639166071-SXSHU7SROXS4N7UNJHQN/Neighborhood+Favorite+Fave+winner+%281%29.jpg", "Nextdoor Neighborhood Fave winner", "https://nextdoor.com/pages/endiro-coffee/", "us"),
 ("lg-chicago", "1678294441297-W4H7MBKN9WJ43CN5JSAY/Chicago+Job+creation.png", "Chicago Job Creators Quest grant 2023", "https://foundersfirstcdc.org/about-us/", "us"),
 ("lg-sluurpy", "1686113345394-EGTLKXMHJPPGQRK6RSM7/Sluurpy+good+coffee+reccomended.png", "Sluurpy, good coffee recommended", "https://www.sluurpy.us/aurora/restaurant/3959805/endiro-coffee", "us"),
 ("lg-ta-choice", "1626811287343-4U01APVG029LTMWVSESK/TravelAdvisorTravelersChoice.png", "Tripadvisor Travelers' Choice 2020", "https://www.tripadvisor.com/Restaurant_Review-g29297-d12816560-Reviews-Endiro_Coffee-Aurora_Illinois.html", "us"),
 ("lg-guru", "1692636028362-Z6ZY8O9B18E9UJ4ICBPQ/Best+Coffee+Restaurant+Guru+%281%29.png", "Restaurant Guru, best coffee 2023", "https://restaurantguru.com/Endiro-Coffee-Aurora-Illinois", "us"),
 ("lg-illinois", "1626813944798-WQ4GBCSPYCI9FWC5U32X/AwardIllinoisMade.jpg", "Illinois Made", "https://www.enjoyillinois.com/explore/listing/endiro-coffee", "us"),
 ("lg-bicycle", "1626813800340-DA0CB6CATPQVM2WPN4E2/Bicycle%2BFriendly.jpg", "Bicycle Friendly Business", "https://www.bikeleague.org/", "us"),
 ("lg-happycow", "1626813026362-I9GCYQ6E5VLV50HX1EJT/AwardHappyCow.jpeg", "HappyCow", "https://www.happycow.net/reviews/endiro-coffee-aurora-111159", "us"),
 ("lg-qcaa", "1626811663635-EU1ARDENPACUENDH23PD/QCAACC-2014-banner-image_v6-01.jpg", "Quad County African American Chamber of Commerce", "https://www.quadcountyaachamber.org/", "us"),
 ("lg-3best", "1673474590214-VIY4WLSTBIX9IF78V2O0/three+best+rated+cafe+aurora+2023.png", "Three Best Rated, cafe in Aurora 2023", "https://threebestrated.com/cafe-in-aurora-il", "us"),
 ("lg-restaurantji", "1672776016624-27C3K5BQG20THT5TNK62/restaurantji+best+coffee+shop.jpg", "Restaurantji, best coffee shop", "https://www.restaurantji.com/il/aurora/endiro-coffee-/", "us"),
 ("lg-yelp", "1626811325710-Y3GZEPU84AAE16GUIABF/AwardYelp.jpg", "Yelp award, Aurora", "https://www.yelp.com/biz/endiro-coffee-aurora", "us"),
 ("lg-tripadvisor", "1594849250134-5I6WC24251VZKWKK5FGY/AwardTripAdvisor.png", "Tripadvisor, Endiro Aurora", "https://www.tripadvisor.com/Restaurant_Review-g29297-d12816560-Reviews-Endiro_Coffee-Aurora_Illinois.html", "us"),
 ("lg-goodfrance", "1553030466967-EWA1QG4M30G0OUMJ673I/GFaward.png", "Good France", "http://restaurateurs.goodfrance.com/en/user/3851", "us"),
 ("lg-quality", "1702581661014-TKRW4Q050BY0BWCIOA84/Quality+Business+Award+2023.jpg", "Quality Business Award 2023, best cafe in Aurora", "https://qualitybusinessawards.com/2023/the-best-cafe-in-aurora-illinois/endiro-coffee", "us"),
]
for k, path, *_ in LOGOS: REMOTE[k] = path

def logo_tiles(group):
    out = ""
    for k, path, name, link, g in LOGOS:
        if g != group or k == "lg-bcorp": continue
        out += f'<li><a class="logo" href="{e(link)}" target="_blank" rel="noopener"><img src="{src(k, 500)}" alt="{e(name)}" loading="lazy" decoding="async" width="240" height="160"></a></li>'
    return f'<ul class="logos" role="list">{out}</ul>'

# ---------- pages ----------
def home():
    tabs = "".join(f'<button class="tab" role="tab" aria-selected="{"true" if i == 0 else "false"}" aria-controls="mt-{t["id"]}" id="tab-{t["id"]}" data-tab="{t["id"]}">{e(t["label"])}</button>' for i, t in enumerate(MENU_TABS))
    panels = ""
    for i, t in enumerate(MENU_TABS):
        rows = "".join(f'<div class="mrow"><div><b>{e(r["name"])}</b><div class="muted small">{e(r["desc"])}</div><div class="tag">{e(r["tags"])}</div></div><div class="price">{e(r["price"])}</div></div>' for r in t["rows"])
        panels += f'<div class="paper" role="tabpanel" id="mt-{t["id"]}" aria-labelledby="tab-{t["id"]}"{"" if i == 0 else " hidden"}><div class="paper-head"><h3>{e(t["sec"])}</h3><span class="muted small">UGX</span></div><p class="muted small" style="margin-top:12px">{e(t["note"])}</p>{rows}</div>'
    body = f'''
<section class="sign" aria-labelledby="hero-h"><div class="wrap">
  <div class="copy">
    <h1 id="hero-h">Ugandan coffee, ready when you arrive.</h1>
    <p class="lead">Order ahead from 18 Endiro cafés, for pickup or delivery.</p>
    <div class="acts"><a class="btn btn-main" href="menu.html">Start your order</a><a class="tlink" href="#find">Find a café</a></div>
  </div>
  <figure class="bleed">{img("team", "Three Endiro baristas in black Endiro t-shirts behind the counter, the round Endiro logo on the window behind them", "photo", eager=True)}</figure>
</div></section>

<section class="sec sand" id="menu" aria-labelledby="menu-h"><div class="wrap menu-stage">
  <div class="side stack">
    <h2 id="menu-h">Coffee, breakfast, lunch and dinner.</h2>
    <p class="lead">The full café menu. Order it for pickup or delivery from any of our 18 cafés.</p>
    <div role="tablist" aria-label="Menu" class="row" data-tabs>{tabs}</div>
    <p class="small muted">Pay with MTN or Airtel Mobile Money, or with crypto.</p>
    <a class="btn btn-line" href="menu.html" style="align-self:flex-start">Open the full menu</a>
  </div>
  <div data-panels>{panels}</div>
</div></section>

<section class="sec" aria-labelledby="tree-h"><div class="wrap farm">
  <div class="farm-text">
    <h2 id="tree-h">From Bukalasi farms to your cup.</h2>
    <p class="lead">Endiro grows, buys, brews and serves its own coffee. We call it tree to cup.</p>
    <ol class="stages">
      <li><h3>The farms</h3><p>Farmer groups in Bukalasi, on Mt. Elgon. Most of the farmers are women. They own their land.</p></li>
      <li><h3>The harvest</h3><p>Ripe red cherries, processed by the fully washed method. Endiro pays the farmers above the Fair Trade floor price.</p></li>
      <li><h3>Your cup</h3><p>Brewed in our cafés by baristas we train. From espresso to jerry can cold brew.</p></li>
    </ol>
    <a class="btn btn-line" href="coffee.html" style="align-self:flex-start">About our coffee</a>
  </div>
  <div class="wall">
    <figure>{img("path", "A farmer walks up a red earth path between coffee plots in Bukalasi, Bududa District", "photo", w=1000)}<figcaption>The path to the farms, Bukalasi.</figcaption></figure>
    <figure>{img("cherries", "Green coffee cherries ripening on the branch", "photo", w=750)}<figcaption>Cherries on the branch.</figcaption></figure>
    <figure>{img("sorting", "Hands sort ripe red coffee cherries from an orange bucket", "photo", w=750)}<figcaption>Sorting the ripe cherries.</figcaption></figure>
    <figure>{img("weighing", "A farmer weighs a yellow sack of coffee on a hanging scale", "photo", w=750)}<figcaption>Weighing the harvest.</figcaption></figure>
    <figure>{img("growers", "A large group of Endiro Growers farmers, women and men, stand together among banana and coffee plants in Bukalasi", "photo", w=1000)}<figcaption>Endiro Growers, Bukalasi.</figcaption></figure>
    <figure>{img("latte", "A hand sets down a cappuccino with leaf latte art on a painted wooden table", "photo", w=750)}<figcaption>Your cup.</figcaption></figure>
  </div>
</div></section>

<section class="sec sand" id="find" aria-labelledby="map-h"><div class="wrap">
  <div class="head"><h2 id="map-h">18 cafés across Uganda.</h2><p class="lead">In Kampala, in Entebbe and along the highways, from Mbale to Fort Portal. Most open at 7 in the morning.</p></div>
  <div class="rail" tabindex="0" aria-label="Endiro cafés in photos">
    <figure>{img("muyenga", "The Endiro sign and the open-air wooden café at Muyenga, Tank Hill", "photo", w=750)}<figcaption>Muyenga, Tank Hill.</figcaption></figure>
    <figure>{img("kisimenti", "The garden path and shaded terrace of the Endiro café in Kisimenti, Kololo", "photo", w=1000)}<figcaption>Kisimenti, Kololo.</figcaption></figure>
    <figure>{img("nakasero", "The bright dining room of the Endiro café in Nakasero, with a tree growing through the roof", "photo", w=750)}<figcaption>Nakasero, Endiro Academy.</figcaption></figure>
    <figure>{img("sipi-view", "A guest relaxes on the wooden deck of the Sipi Falls café, the hills and the falls behind", "photo", w=750)}<figcaption>Sipi Falls, Lacam Lodge.</figcaption></figure>
    <figure>{img("mbale", "Wooden tables and the counter in the Endiro café in Mbale", "photo", w=750)}<figcaption>Mbale.</figcaption></figure>
  </div>
  <div class="finder" data-finder>
    {finder_bar()}
    {finder_cards()}
  </div>
  <div class="row" style="margin-top:var(--space-xl)"><a class="btn btn-main" href="cafes.html">All cafés, hours and map</a><a class="tlink" href="menu.html">Order from a café</a></div>
</div></section>

<section class="sec night" aria-labelledby="people-h"><div class="wrap stack" style="gap:var(--space-2xl)">
  <h2 id="people-h">We hire people of all abilities.</h2>
  <div class="statement"><p class="fig8">8%</p><p class="says">of people with disabilities in Uganda have a formal job.</p></div>
  <div class="split rev">
    {img("academy", "A trainer at a whiteboard about espresso teaches Endiro Academy students at a wooden table in the Nakasero café", "photo")}
    <div class="stack">
      <p class="lead">Our Sign Language Café opened in Nakasero in 2020. Today, staff with disabilities work in all our cafés, deaf staff too.</p>
      <p class="muted">Order online and your order number is on your phone, so nobody has to shout over the counter.</p>
      <a class="btn btn-light" href="academy.html" style="align-self:flex-start">About Endiro Academy</a>
    </div>
  </div>
</div></section>

<section class="sec" id="bcorp" aria-labelledby="bcorp-h"><div class="wrap">
  <div class="bcorp">
    <a class="badge-bcorp" href="https://www.bcorporation.net/en-us/find-a-b-corp/company/endiro-coffee" target="_blank" rel="noopener"><img src="{src("lg-bcorp", 1000)}" alt="Certified B Corporation. This company meets the highest standards of social and environmental impact." loading="lazy" decoding="async" width="1376" height="627"></a>
    <div class="stack">
      <h2 id="bcorp-h">Certified B Corp since 2019.</h2>
      <p class="lead">B Corp checks the whole business: farmer pay, farming, energy on the farms, and pay inside the company.</p>
      <dl class="scores"><div><dt>107.3</dt><dd>Endiro's B Impact Score</dd></div><div><dt>50.9</dt><dd>the median for ordinary businesses</dd></div></dl>
      <a class="tlink" href="https://www.bcorporation.net/en-us/find-a-b-corp/company/endiro-coffee" target="_blank" rel="noopener">See our B Corp profile</a>
    </div>
  </div>
  <h3 class="logos-h">Awards and partners, Uganda and worldwide</h3>
  {logo_tiles("ug")}
  <h3 class="logos-h">Awards for Endiro Aurora, Illinois, USA</h3>
  {logo_tiles("us")}
</div></section>

<section class="sec sand" aria-labelledby="journal-h"><div class="wrap">
  <div class="head"><h2 id="journal-h">From the journal.</h2><p class="lead">Coffee prices, farming and the future of cafés, written by the Endiro team.</p></div>
  <div class="jr">
    <div class="lead-post">{post_card(POSTS[0])}</div>
    <div class="rows">{"".join(post_card(p) for p in POSTS[1:3])}<a class="tlink" href="journal.html">All articles</a></div>
  </div>
</div></section>

<section class="sec sign-close" aria-labelledby="close-h"><div class="wrap head" style="margin-bottom:0">
  <div class="stack"><h2 id="close-h">Your usual, without the queue.</h2><p class="lead">Pick a café, order, and pay from your phone. We start when you pay.</p></div>
  <a class="btn btn-main" href="menu.html" style="justify-self:start">Start your order</a>
</div></section>
'''
    return page("index.html", "Endiro Coffee, Uganda: order ahead from 18 cafés", "Ugandan tree-to-cup coffee and food. Order ahead from 18 Endiro cafés for pickup or delivery, and pay with mobile money.", body, ("finder.js",))

ORGS = [
    ("Certified B Corp", "Certified in October 2019. Overall B Impact Score 107.3 (the median for ordinary businesses is 50.9).", "https://www.bcorporation.net/en-us/find-a-b-corp/company/endiro-coffee"),
    ("sofi Award 2022, Specialty Food Association", "New Product Award for our flagship coffee, Uganda Bududa Bukalasi.", "https://www.specialtyfood.com/organization/301280/endiro-coffee-llc/"),
    ("Specialty Coffee Association, Design", "The SCA design site shows our Sipi Falls café among its featured coffee spaces.", "https://design.sca.coffee/latest/endiro-coffee-sipi-falls-uganda"),
    ("SME Climate Hub", "Endiro is a committed business on the SME Climate Hub.", "https://smeclimatehub.org/committed-businesses/?search=endiro%20coffee"),
    ("Absa, World Economic Forum on Africa", "Absa shows Endiro Coffee among its clients at the World Economic Forum on Africa.", "https://www.absa.africa/world-economic-forum/africa/clients/endiro-coffee/"),
    ("Lonely Planet", "Named among the top nine coffee shops in Uganda (2016).", ORIG + "/endirocoffee/we-are-thrilled-to-see-that-the-lonely-planet-one"),
]

def about():
    mission = [
        ("Tree to cup", "Run every step of the coffee chain, from the coffee tree to the coffee cup."),
        ("Quality", "Make every step better and bigger, so that more coffee reaches the highest standard."),
        ("Growth", "Open more cafés in Uganda and abroad, sell in shops and supermarkets, and supply green and roasted beans."),
        ("Community", "Work with the people where we grow, process and sell coffee: mentoring, jobs and education for the most vulnerable."),
    ]
    mrows = "".join(f'<div class="idx-row"><div class="stack-s"><h3>{i+1}. {e(a)}</h3><p class="muted">{e(b)}</p></div></div>' for i, (a, b) in enumerate(mission))
    orgs = "".join(f'<a class="idx-row" href="{u}" style="text-decoration:none;color:var(--ink)"><div class="stack-s"><h3>{e(a)}</h3><p class="muted">{e(b)}</p></div><span class="link">Open</span></a>' for a, b, u in ORGS)
    body = phead("Our story", "Coffee that ends child vulnerability.", "Endiro started in Kampala in 2011. Our vision is to end child vulnerability globally through coffee, its people, its profits and its spaces.") + f'''
<section class="sec-tight" style="padding-top:0"><div class="wrap">{img("growers", "A large group of Endiro Growers farmers, women and men, stand together among banana and coffee plants in Bukalasi", "photo h-560", eager=True)}<figcaption>Endiro Growers in Bukalasi, Bududa District.</figcaption></div></section>

<section class="sec"><div class="wrap split top">
  <h2>Brew all the good we can.</h2>
  <div class="stack">
    <p>We believe in hospitality, conversation, prayer, partnership, community and family. That is where good coffee that does good things comes from.</p>
    <p class="muted">Since 2011 Endiro has supported projects for vulnerable children and families. In 2014 we started to change how we do the coffee business, at every step, so that all of it has a good effect on people.</p>
    <p class="muted">In 2015 we met coffee farmers in Bukalasi. Their coffee had a Fair Trade label, but middlemen took the money. So we formed our own farmer groups, paid them better prices, and gave them training and tools.</p>
  </div>
</div></section>

<section class="sec sand"><div class="wrap split top">
  <div class="stack"><h2>Our mission, 2016 to 2026.</h2><p class="muted">Four parts, one aim: the vision above.</p></div>
  <div class="idx">{mrows}</div>
</div></section>

<section class="sec"><div class="wrap split top">
  <div class="stack"><h2>The founders.</h2><p class="muted">Gloria Katusiime and Cody Lorance met at the Lausanne Congress in Cape Town in 2010. Neither had a business background: Gloria was a journalist, Cody a pastor.</p></div>
  <div class="grid-2">
    <div class="fig person"><b>Gloria Katusiime</b><span>Founder and Co-CEO. From Uganda, a journalist before Endiro.</span></div>
    <div class="fig person"><b>Cody Lorance</b><span>Co-founder and Co-CEO. A pastor before Endiro. He opened the first Endiro café in the USA, in Aurora, in 2017.</span></div>
  </div>
</div></section>

<section class="sec night" aria-labelledby="team-h"><div class="wrap split rev">
  {img("team", "Three Endiro baristas behind the counter", "photo h-480")}
  <div class="stack">
    <h2 id="team-h">Our team.</h2>
    <p class="muted">Baristas, chefs, servers, cashiers and managers in 18 cafés. We offer internships, and training at the Endiro Academy. Staff with disabilities work in all our cafés.</p>
    <p class="muted">[Team photos and names: to supply, with each person’s consent.]</p>
    <div class="row"><a class="btn btn-light" href="careers.html">Work with us</a><a class="btn btn-ghost-light" href="academy.html">Endiro Academy</a></div>
  </div>
</div></section>

<section class="sec"><div class="wrap split top">
  <h2>Milestones.</h2>
  <dl class="tl">
    <dt>2010</dt><dd>Gloria and Cody meet at the Lausanne Congress in Cape Town.</dd>
    <dt>2011</dt><dd>Endiro opens in Kampala.</dd>
    <dt>2014</dt><dd>We start to rebuild the business around the whole coffee chain.</dd>
    <dt>2015</dt><dd>We meet the farmers of Bukalasi and form the first farmer groups.</dd>
    <dt>2016</dt><dd>The first growing season of Endiro Growers ends.</dd>
    <dt>2017</dt><dd>The first Endiro café in the USA opens, in Aurora, Illinois.</dd>
    <dt>2019</dt><dd>Endiro becomes a Certified B Corp.</dd>
    <dt>2020</dt><dd>The Sign Language Café opens in Nakasero.</dd>
    <dt>2021</dt><dd>Our café at Lacam Lodge, Sipi Falls opens.</dd>
    <dt>2022</dt><dd>Our Bukalasi coffee wins a sofi New Product Award.</dd>
  </dl>
</div></section>

<section class="sec sand" aria-labelledby="org-h"><div class="wrap split top">
  <div class="stack"><h2 id="org-h">Partners and recognition.</h2><p class="muted">B Corp checks the whole business: farmer pay, organic and sustainable farming, renewable energy on the farms, and pay inside the company (the highest pay is not more than 10 times the lowest). B Corp also certifies Endiro as majority black-owned and woman-owned.</p></div>
  <div class="idx">{orgs}</div>
</div></section>
'''
    return page("about.html", "Our story: Endiro Coffee", "How Endiro Coffee started in Kampala in 2011, its vision, its founders, its team and its partners.", body)

BREWS = [("Espresso", "The base of our classics, from a single shot to a latte."), ("House coffee", "Brewed coffee, the everyday cup."),
         ("Primula pour over", "A flat-bottomed steel filter for a clean cup."), ("Aeropress", "Pressure pushes hot water through the coffee. Rich and clean."),
         ("French press", "Full-bodied, pressed through steel mesh. Served at the table."), ("Jerry can cold brew", "12 hours in jerry cans, then cloth filters. Bright and fruity.")]

def coffee():
    brews = "".join(f'<div class="idx-row"><div class="stack-s"><h3>{e(a)}</h3><p class="muted">{e(b)}</p></div></div>' for a, b in BREWS)
    body = phead("Our coffee", "Bukalasi coffee, grown by women who own their land.", "Our flagship coffee grows in the village of Bukalasi, Bududa District, high on Mt. Elgon in Eastern Uganda.") + f'''
<section class="sec-tight" style="padding-top:0"><div class="wrap grid-2">
  {img("cherries", "Green coffee cherries on a branch", "photo h-480", eager=True)}
  {img("weighing", "A coffee farmer weighs a sack on a hanging scale outside a farm building", "photo h-480", eager=True)}
</div></section>

<section class="sec"><div class="wrap split top">
  <div class="stack"><h2>The coffee facts.</h2><p class="muted">From our master roaster’s notes on Uganda Bududa Bukalasi.</p></div>
  <dl class="facts">
    <dt>Species</dt><dd>Coffea arabica</dd>
    <dt>Process</dt><dd>Fully washed</dd>
    <dt>Altitude</dt><dd>1,750 to 1,860 m</dd>
    <dt>Body</dt><dd>Medium, like fruit juice in the mouth</dd>
    <dt>Flavour</dt><dd>Round, not sharp. Dried stone fruit, like dried cherries or cranberries. A sweet, earthy walnut note.</dd>
    <dt>Finish</dt><dd>Floral and herbal, like lavender or sweet basil. Sometimes a light spice, like allspice.</dd>
    <dt>Added flavour</dt><dd>None. The notes come from the bean.</dd>
  </dl>
</div></section>

<section class="sec sand"><div class="wrap split rev">
  {img("beehive", "A wooden beehive hangs on a pole between green plants on a coffee farm", "photo h-480")}
  <div class="stack">
    <h2>Organic, without the label.</h2>
    <p class="muted">The farmers use no synthetic fertilizer or pesticide. They make fertilizer from coffee cherry pulp and manure, and a plant spray from Mexican sunflower, peri-peri chili and ashes.</p>
    <p class="muted">The trees grow in shade, between local plants. The farmers keep bees and let animals graze. Water comes from springs, waterfalls and rain tanks. Any electricity on the farms is solar.</p>
    <p class="muted">We are not certified organic. We chose the B Corp check instead, because it looks at farming, pay, energy and water together.</p>
  </div>
</div></section>

<section class="sec"><div class="wrap split">
  <div class="stack">
    <h2>Better than fair trade.</h2>
    <p class="muted">We buy directly from the farmer groups and pay above the Fair Trade floor price. When we started, we offered 25 to 30% more than other buyers.</p>
    <div class="grid-2"><div class="fig"><b>250+</b><span>farmers in Bukalasi worked with Endiro Growers in 2021.</span></div><div class="fig"><b>2015</b><span>The year the first farmer group started, about 200 women.</span></div></div>
  </div>
  {img("sorting", "Hands sort ripe red coffee cherries", "photo h-480")}
</div></section>

<section class="sec night"><div class="wrap split top">
  <div class="stack"><h2>No light, medium or dark.</h2><p class="muted">Colour and oil only tell part of the story. We roast each bean for the profile its origin can give. For Bukalasi that is a medium body, mild acidity and a sweet, fruity finish.</p></div>
  <div class="stack"><h3>How we brew it in the cafés</h3><div class="idx">{brews}</div><a class="btn btn-light" href="menu.html" style="align-self:flex-start">See the coffee menu</a></div>
</div></section>

<section class="sec" aria-labelledby="where-h"><div class="wrap stack" style="gap:32px">
  <div class="split top"><h2 id="where-h">Where it grows.</h2><p class="lead">Bukalasi is in Bududa District, on the slopes of Mt. Elgon near the Kenya border. We also work with growers near Sipi Falls in Kapchorwa, where our Lacam Lodge café looks over the valley.</p></div>
  <iframe class="map" title="Map of Bukalasi, Bududa District, Uganda" src="{gmap("Bukalasi, Bududa, Uganda", 11)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>
  <div class="grid-2">{img("sipi-view", "A guest relaxes on the wooden balcony of the Endiro café at Sipi Falls, looking over a green valley", "photo h-360")}{img("green", "Green coffee beans before roasting", "photo h-360")}</div>
</div></section>
'''
    return page("coffee.html", "Our coffee: Bukalasi, Mt. Elgon | Endiro Coffee", "Endiro's Bukalasi coffee: arabica, fully washed, grown at 1,750 to 1,860 m by farmer groups on Mt. Elgon, paid above the Fair Trade floor price.", body)

def cafes():
    groups = [("Kampala", [b for b in B if b["area"] == "Kampala"]), ("Entebbe and upcountry", [b for b in B if b["area"] != "Kampala"])]
    out = ""
    for g, rows in groups:
        items = ""
        for b in rows:
            pic = f'<img src="{b["photo"]}" alt="" loading="lazy" width="120" height="90">' if b["photo"] else '<div class="noimg" aria-hidden="true"></div>'
            note = f'<p class="note">{e(b["note"])}</p>' if b.get("note") else ""
            items += f'''<article class="cafe" data-cafe data-area="{e(b["area"])}" data-text="{e((b["name"] + " " + b["address"] + " " + b["area"]).lower())}" data-embed="{e(b["embed"])}" id="cafe-{b["id"]}">{pic}<div class="stack-s" style="gap:4px"><h3>{e(b["name"])}</h3><p class="muted small">{e(b["address"])}</p><p class="small">{e(b["hours"])}</p>{note}<div class="acts"><button class="linkish" type="button" data-show-map>Show on the map</button><a href="{b["dir"]}" target="_blank" rel="noopener" data-nav>Navigate from here</a><a href="{b["tel"]}">{e(b["phone"])}</a><a href="menu.html?cafe={b["id"]}">Order here</a></div></div></article>'''
        out += f'<section class="stack-s" data-group="{e(g)}"><h2 class="grouphead">{e(g)}</h2>{items}</section>'
    body = phead("Cafés", "Visit us.", "18 cafés in Uganda. Find the nearest, see the hours, and order ahead.") + f'''
<section class="sec-tight" style="padding-top:0"><div class="wrap split top half">
  <div data-finder>
    {finder_bar("Search the cafés")}
    {out}
    <p class="note" data-none hidden>No café matches. Try a town name, for example Mbale.</p>
  </div>
  <div class="stack-s order-first sticky-map" id="map">
    <iframe class="map map-tall" title="Map of the selected Endiro café" src="{gmap("Endiro Coffee Kampala", 12)}" data-map loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>
    <p class="note" data-map-label>Endiro cafés in Kampala. Choose a café to see it on the map.</p>
  </div>
</div></section>

<section class="sec sand"><div class="wrap split top">
  <div class="stack"><h2>Questions or events?</h2><p class="muted">Write to us, or call the café you want to visit. For wholesale and work, see the pages below.</p></div>
  <div class="row"><a class="btn btn-main" href="mailto:contact@endirocoffee.com">contact@endirocoffee.com</a><a class="btn btn-line" href="wholesale.html">Wholesale</a><a class="btn btn-line" href="careers.html">Careers</a></div>
</div></section>
'''
    return page("cafes.html", "Cafés, hours and map | Endiro Coffee", "All 18 Endiro Coffee cafés in Uganda with addresses, hours, phone numbers, maps and directions.", body, ("finder.js", "cafes.js"))

def academy():
    body = phead("Endiro Academy", "Skills for people of all abilities.", "We train, hire and support people of all abilities in all our cafés. The Endiro Academy in Nakasero is where the training starts.") + f'''
<section class="sec-tight" style="padding-top:0"><div class="wrap">{img("nakasero", "The Endiro café in Nakasero with a tall tree growing through the room, tables and a skylight", "photo h-560", eager=True)}</div></section>

<section class="sec"><div class="wrap split top">
  <h2>Why inclusion.</h2>
  <div class="stack">
    <p>In Uganda, people with disabilities often meet stigma. It keeps them from school, health care, formal work and community life.</p>
    <div class="fig"><b>8%</b><span>of people with disabilities in Uganda have a formal job.</span></div>
    <p class="muted">We changed our cafés and the way we hire, so that our staff with disabilities get the same chances to work and to grow.</p>
  </div>
</div></section>

<section class="sec night"><div class="wrap split rev">
  {img("academy", "A trainer at a whiteboard about espresso teaches students at a wooden table", "photo h-480")}
  <div class="stack">
    <h2>From one café to every café.</h2>
    <p class="muted">The Sign Language Café opened in Nakasero in 2020. There we began to hire on purpose within the deaf community, and other businesses in Uganda changed how they hire too.</p>
    <p class="muted">One café was not enough. Now staff with disabilities work across all our cafés, and the team from the Sign Language Café moved to other locations.</p>
  </div>
</div></section>

<section class="sec"><div class="wrap stack" style="gap:32px">
  <h2>Two programs.</h2>
  <div class="grid-2">
    <div class="paper stack" style="border:2px solid var(--ink)"><h3>Master Barista Training Program</h3><p class="muted">Barista training at the Academy in Nakasero. [Content, length, fees and intake dates: to confirm.]</p><a class="btn btn-main" href="careers.html?role=Master%20Barista%20Program#apply" style="align-self:flex-start">Apply</a></div>
    <div class="paper stack" style="border:2px solid var(--ink)"><h3>Supportive Employment Fellowship</h3><p class="muted">A supported work program for adults with neurodevelopmental disabilities, inside a working café. [Length and intake dates: to confirm.]</p><a class="btn btn-main" href="careers.html?role=Supportive%20Employment%20Fellowship#apply" style="align-self:flex-start">Apply</a></div>
  </div>
</div></section>

<section class="sec sand"><div class="wrap split top">
  <div class="stack"><h2>When you visit.</h2><p class="muted">Some of our staff are deaf. Point at the menu, write it down, or order online and show your order number.</p></div>
  <div class="row"><a class="btn btn-main" href="menu.html">Order ahead</a><a class="btn btn-line" href="mailto:contact@endirocoffee.com?subject=Inclusion%20at%20Endiro">Ask about our inclusive model</a></div>
</div></section>
'''
    return page("academy.html", "Endiro Academy and inclusion | Endiro Coffee", "Endiro trains, hires and supports people of all abilities: the Sign Language Café, the Master Barista Training Program and the Supportive Employment Fellowship.", body)

def journal():
    years = {}
    for p in POSTS[3:]:
        years.setdefault(p[2][:4], []).append(p)
    idx = ""
    for y in sorted(years, reverse=True):
        rows = "".join(f'<a class="idx-row" href="{ORIG}{p[1]}" style="text-decoration:none;color:var(--ink)"><h3>{e(p[0])}</h3><time datetime="{p[2]}">{p[3]}</time></a>' for p in years[y])
        idx += f'<div class="split top yr yearrow"><h2 class="year">{y}</h2><div class="idx">{rows}</div></div>'
    body = phead("Journal", "The journal.", "Essays and reports from the Endiro team: coffee prices, farming, climate and the future of cafés. The articles open on endirocoffee.com.") + f'''
<section class="sec-tight" style="padding-top:0"><div class="wrap grid-3">{"".join(post_card(p, "h-280") for p in POSTS[:3])}</div></section>
<section class="sec sand"><div class="wrap">{idx}</div></section>
'''
    return page("journal.html", "Journal | Endiro Coffee", "Articles from Endiro Coffee about coffee prices, farmers, climate, roasting and cafés.", body)

ROLES = [("Barista", "Make espresso and handcrafted coffee. We train you."), ("Chef", "Cook our breakfast, lunch and dinner menu."),
         ("Server", "Look after guests at the table."), ("Cashier", "Take orders and payments."),
         ("Manager", "Run a café: team, stock and guests."), ("Master Barista Program", "Advanced barista training at the Endiro Academy."),
         ("Supportive Employment Fellowship", "Supported work for adults with neurodevelopmental disabilities.")]
LOCS = ["Kampala", "Entebbe", "Buwama", "Mbale", "Iganga", "Busia", "Sipi Falls", "Fort Portal", "Any location"]

def careers():
    roles = "".join(f'<div class="idx-row"><div class="stack-s"><h3>{e(a)}</h3><p class="muted">{e(b)}</p></div><a class="link" href="careers.html?role={urllib.parse.quote(a)}#apply" data-role="{e(a)}">Apply</a></div>' for a, b in ROLES)
    ropts = "".join(f'<option>{e(a)}</option>' for a, _ in ROLES)
    lopts = "".join(f'<option>{e(l)}</option>' for l in LOCS)
    iopts = "".join(f'<option>{e(l)}</option>' for l in ["Kampala", "Buwama", "Mbale", "Iganga", "Bukalasi"])
    body = phead("Careers", "Brew all the good you can, as a job.", "Start a career in coffee and hospitality as a barista, chef, server, cashier or manager in one of our cafés. We train, and we hire people of all abilities.") + f'''
<section class="sec-tight" style="padding-top:0"><div class="wrap split top">
  <div class="stack">{img("team", "Three Endiro baristas behind the counter", "photo h-420", eager=True)}<p class="muted">[Pay, hours and open positions per café: to confirm before launch.]</p></div>
  <div class="idx">{roles}</div>
</div></section>

<section class="sec sand" id="apply" aria-labelledby="apply-h"><div class="wrap split top">
  <div class="stack"><h2 id="apply-h">Apply for a job.</h2><p class="muted">Tell us a little about you. A manager calls you back.</p></div>
  <form class="form" data-form="job" novalidate>
    <label class="f">First name<input name="first" required autocomplete="given-name"></label>
    <label class="f">Last name<input name="last" required autocomplete="family-name"></label>
    <label class="f">Phone<input name="phone" type="tel" required autocomplete="tel" inputmode="tel"></label>
    <label class="f">Email<input name="email" type="email" autocomplete="email"></label>
    <label class="f">Role<select name="role" required>{ropts}</select></label>
    <label class="f">Where do you want to work?<select name="location">{lopts}</select></label>
    <label class="f full">Your experience<textarea name="experience" placeholder="Jobs, training, school. Coffee experience is not needed."></textarea></label>
    <label class="f full">Why Endiro?<textarea name="why" required></textarea></label>
    <p class="note full">Do you need an adjustment for the interview, such as a sign language interpreter? Tell us in the box above.</p>
    <div class="full row"><button class="btn btn-main" type="submit">Send my application</button><span role="status" aria-live="polite" data-form-msg></span></div>
  </form>
</div></section>

<section class="sec" id="internship" aria-labelledby="int-h"><div class="wrap split top">
  <div class="stack"><h2 id="int-h">Internships in Uganda.</h2><p class="muted">Three-month internships in different roles, in Kampala, Buwama, Mbale, Iganga or on the farms in Bukalasi.</p>{img("path", "A red earth path between coffee plots in Bukalasi", "photo h-360")}</div>
  <form class="form" data-form="internship" novalidate>
    <label class="f">First name<input name="first" required autocomplete="given-name"></label>
    <label class="f">Last name<input name="last" required autocomplete="family-name"></label>
    <label class="f">Parish or village<input name="village" required></label>
    <label class="f">District<input name="district" required></label>
    <label class="f">Email<input name="email" type="email" required autocomplete="email"></label>
    <label class="f">Phone<input name="phone" type="tel" required autocomplete="tel" inputmode="tel"></label>
    <label class="f">Where?<select name="location">{iopts}</select></label>
    <label class="f">When can you start?<input name="start" type="date" required></label>
    <label class="f full">What do you hope to learn?<textarea name="hope" required></textarea></label>
    <label class="f full">Your goal in five years<textarea name="goal" required></textarea></label>
    <label class="f full">References (names and phone numbers)<textarea name="refs" required></textarea></label>
    <label class="f full">How did you hear about us?<input name="heard" required></label>
    <div class="full row"><button class="btn btn-main" type="submit">Apply for an internship</button><span role="status" aria-live="polite" data-form-msg></span></div>
  </form>
</div></section>
'''
    return page("careers.html", "Careers and internships | Endiro Coffee", "Jobs at Endiro Coffee in Uganda: barista, chef, server, cashier, manager, the Master Barista Program, the Supportive Employment Fellowship and three-month internships.", body, ("forms.js",))

FAQ = [
    ("Where is your coffee from?", ["Our flagship coffee grows in Bukalasi village, Bududa District, in the Mt. Elgon range. Farmer groups grow it, most of them women who own their land. They earn some of the highest pay of any coffee farmers in Uganda, and they have built schools with that income."]),
    ("What does it taste like?", ["Medium body, mild acidity and a sweet, fruity finish. Notes of dried cranberry, walnut and allspice."]),
    ("Which roast do you offer?", ["By colour and oil it is near a medium roast. We do not print that on the bag. We roast each bean for the profile its origin gives, not for a colour."]),
    ("Which brew method do you recommend?", ["All of them work. In our cafés we serve espresso and house coffee, plus pour-over, Aeropress, French press and jerry can cold brew. Pour-over and Aeropress bring out the fruity notes best."]),
    ("Is the coffee organic?", ["It is farmed organically, but it is not certified organic. The farmers use no synthetic fertilizer or pesticide. Water is from springs, waterfalls and rain tanks. Electricity on the farms is solar."]),
    ("Is it fair trade?", ["We pay above the Fair Trade floor price. We chose to be a Certified B Corp instead of single-issue labels, because B Corp checks farmer pay, farming, energy, water and pay inside the company together."]),
    ("What can I buy wholesale?", ["Retail bags of 300 g (10 bags minimum), roasted coffee in 1 kg bags (5 bags minimum), and green coffee in 60 kg bags."]),
    ("What are the prices and delivery terms in Uganda?", ["[Wholesale prices, delivery and payment terms in Uganda: to confirm.] Send the form and we reply with an offer."]),
]

def wholesale():
    faq = "".join(f'<details><summary>{e(q)}</summary><div class="ans">{"".join(f"<p>{e(a)}</p>" for a in ans)}</div></details>' for q, ans in FAQ)
    prods = [("Retail bags", "300 g whole bean. Minimum order 10 bags. For shops and supermarkets."), ("Roasted coffee", "1 kg bags. Minimum order 5 bags. For cafés, offices and kitchens."), ("Green coffee", "60 kg bags of unroasted Bukalasi arabica. For roasters.")]
    pcards = "".join(f'<div class="paper stack-s" style="border:2px solid var(--ink)"><h3>{e(a)}</h3><p class="muted">{e(b)}</p></div>' for a, b in prods)
    uses = ["Resale", "Coffee bar", "Roastery", "Religious services", "Office or business", "Ingredient in food or drink", "Other"]
    uopts = "".join(f'<label class="chip" style="display:inline-flex;align-items:center;gap:8px"><input type="checkbox" name="use" value="{e(u)}" style="width:auto;min-height:0"> {e(u)}</label>' for u in uses)
    body = phead("Wholesale", "Serve Bukalasi coffee in your business.", "Hotels, cafés, offices, shops and roasters can buy Endiro coffee roasted or green, straight from the people who grow it.") + f'''
<section class="sec-tight" style="padding-top:0"><div class="wrap split">
  {img("bags", "Jute sacks of green coffee stamped with the Endiro logo, stacked on a pallet", "photo h-480", eager=True)}
  <div class="stack"><h2>What we supply.</h2><div class="stack-s">{pcards}</div></div>
</div></section>

<section class="sec sand" aria-labelledby="faq-h"><div class="wrap split top">
  <div class="stack"><h2 id="faq-h">Questions and answers.</h2><p class="muted">About the coffee, the farming and how to order.</p></div>
  <div class="faq">{faq}</div>
</div></section>

<section class="sec" id="apply" aria-labelledby="wapply-h"><div class="wrap split top">
  <div class="stack"><h2 id="wapply-h">Apply for a wholesale account.</h2><p class="muted">We reply by email with prices and the next steps.</p></div>
  <form class="form" data-form="wholesale" novalidate>
    <label class="f full">Business name<input name="org" required autocomplete="organization"></label>
    <label class="f">Your name<input name="name" required autocomplete="name"></label>
    <label class="f">Phone<input name="phone" type="tel" required autocomplete="tel" inputmode="tel"></label>
    <label class="f">Email<input name="email" type="email" required autocomplete="email"></label>
    <label class="f">City or town<input name="city" required></label>
    <label class="f full">Address<input name="address" required autocomplete="street-address"></label>
    <label class="f">Product<select name="product" required><option>Retail bags, 300 g</option><option>Roasted coffee, 1 kg</option><option>Green coffee, 60 kg</option><option>Other</option></select></label>
    <label class="f">Quantity per month<input name="qty" placeholder="For example 20 bags"></label>
    <fieldset class="full" style="border:0;padding:0;margin:0"><legend class="note" style="margin-bottom:8px">How will you use the coffee?</legend><div class="chips">{uopts}</div></fieldset>
    <label class="f full">Tell us about your needs<textarea name="needs" required></textarea></label>
    <div class="full row"><button class="btn btn-main" type="submit">Send the application</button><span role="status" aria-live="polite" data-form-msg></span></div>
  </form>
</div></section>
'''
    return page("wholesale.html", "Wholesale coffee | Endiro Coffee", "Buy Endiro's Bukalasi coffee wholesale in Uganda: 300 g retail bags, 1 kg roasted bags and 60 kg green coffee bags.", body, ("forms.js",))

def menu():
    body = '''
<section class="phead" style="padding-bottom:24px"><div class="wrap">
  <div class="row" style="justify-content:space-between;align-items:end;gap:20px">
    <div><p class="crumbs"><a href="index.html">Home</a> / Menu</p><h1>Menu and order</h1></div>
    <div class="seg" role="group" aria-label="Pickup or delivery"><button type="button" aria-pressed="true" data-mode="pickup">Pickup</button><button type="button" aria-pressed="false" data-mode="delivery">Delivery</button></div>
  </div>
  <div class="row sand" style="margin-top:24px;padding:20px 24px;border-radius:var(--radius-card);gap:16px 32px">
    <label class="f"><span data-cafe-label>Pick up at</span><select data-branch></select></label>
    <div class="stack-s" style="gap:2px;flex:1 1 220px"><b data-hours style="font-family:var(--font-display)"></b><span class="muted small" data-address></span></div>
    <div class="chips" role="group" aria-label="Ready at" data-times>
      <button class="chip" type="button" aria-pressed="true" data-time="As soon as possible">As soon as possible</button>
      <button class="chip" type="button" aria-pressed="false" data-time="In 30 minutes">In 30 minutes</button>
      <button class="chip" type="button" aria-pressed="false" data-time="In 1 hour">In 1 hour</button>
    </div>
    <p class="small muted" data-delivery-note hidden style="max-width:46ch">Delivery menu: the prices are the same as on Glovo. Delivery fee: [set per zone]. <a href="https://glovoapp.com/ug/en/kampala/endiro-muyenga-kpa/">Order on Glovo</a></p>
  </div>
</div></section>
<section class="sec-tight" style="padding-top:8px"><div class="wrap split top wide">
  <div>
    <div class="row" role="tablist" aria-label="Menu part" data-groups>
      <button class="tab" role="tab" aria-selected="true" data-group="drinks">Drinks</button>
      <button class="tab" role="tab" aria-selected="false" data-group="breakfast">Breakfast</button>
      <button class="tab" role="tab" aria-selected="false" data-group="lunch">Lunch and dinner</button>
    </div>
    <div data-sections><noscript><p class="note" style="margin-top:24px">Turn on JavaScript to order online. The menu is also in every café.</p></noscript></div>
  </div>
  <aside class="cartbox" aria-label="Your order">
    <h2 class="toolhead">Your order</h2>
    <p class="small muted" data-summary></p>
    <div data-lines></div>
    <div class="totals"><span>Subtotal</span><span data-sub style="text-align:right"></span><span data-del-l hidden>Delivery</span><span data-del-v hidden style="text-align:right">[set per zone]</span><span class="t">Total</span><span class="t" data-total style="text-align:right"></span></div>
    <a class="btn btn-main" href="checkout.html" data-go>Go to payment</a>
    <p class="small muted">Pay with MTN or Airtel Mobile Money (MUDA Pay) or with crypto.</p>
  </aside>
</div></section>
'''
    return page("menu.html", "Menu and online order | Endiro Coffee", "The full Endiro Uganda menu with prices in shillings: coffee, juices, smoothies, breakfast, lunch and dinner. Order for pickup or delivery.", body, ("menu.js",))

def checkout():
    body = '''
<section class="sec-tight"><div class="wrap split top co">
  <div class="stack">
    <p class="crumbs"><a href="menu.html">Back to the menu</a></p>
    <h1 style="font-size:clamp(34px,4vw,48px)">Pay for your order</h1>
    <p class="muted" data-co-summary></p>
    <div class="form">
      <label class="f">Name on the order<input data-name autocomplete="name" required></label>
      <label class="f">Phone, for the pickup message<input data-phone type="tel" autocomplete="tel" inputmode="tel" placeholder="07XX XXX XXX" required></label>
    </div>
    <div role="radiogroup" aria-labelledby="how-h" class="stack-s">
      <h2 id="how-h" class="toolhead">How do you want to pay?</h2>
      <button class="pay" type="button" role="radio" aria-checked="true" data-method="mtn"><span class="radio-mark" aria-hidden="true"></span><b>MTN Mobile Money</b><span>Through MUDA Pay. No extra fee.</span></button>
      <button class="pay" type="button" role="radio" aria-checked="false" data-method="airtel"><span class="radio-mark" aria-hidden="true"></span><b>Airtel Money</b><span>Through MUDA Pay. No extra fee.</span></button>
      <button class="pay" type="button" role="radio" aria-checked="false" data-method="crypto"><span class="radio-mark" aria-hidden="true"></span><b>Crypto</b><span>Pay from any wallet: USDT, USDC, Bitcoin, Ethereum and more.</span></button>
    </div>
    <div class="sand stack-s" style="padding:24px;border-radius:var(--radius-card)" data-momo>
      <label class="f"><span data-momo-label>MTN Mobile Money number</span><input data-pay-phone type="tel" inputmode="tel" placeholder="07XX XXX XXX" aria-describedby="momo-help"></label>
      <p id="momo-help" class="small muted">We send a payment request to this phone. You approve it with your PIN. We never see your PIN.</p>
      <button class="btn btn-main" type="button" data-pay-momo>Send the payment request to my phone</button>
    </div>
    <div class="sand stack-s" style="padding:24px;border-radius:var(--radius-card)" data-crypto hidden>
      <div class="row" style="justify-content:space-between"><b style="font-family:var(--font-display);font-size:28px" data-usdt></b><span class="small muted">network fee added</span></div>
      <p class="small muted" data-rate></p>
      <div data-crypto-pick class="stack-s">
        <label class="f">Coin and network<select data-coin><option value="">Loading the coins...</option></select></label>
        <button class="btn btn-main" type="button" data-pay-crypto>Get the payment address</button>
      </div>
      <div class="ecp-box" data-crypto-box hidden></div>
      <p class="small muted">Send the full amount in one payment. If you send less, the order is cancelled. The network cannot reverse a crypto payment. Refunds: [policy to confirm].</p>
    </div>
    <p class="err-box" data-err hidden role="alert"></p>
  </div>
  <aside aria-label="Receipt">
    <div class="printer night">
      <div class="row" style="justify-content:space-between"><img src="img/logo-white.png" alt="" width="40" height="37"><span class="small" style="color:var(--on-night-2)" data-order-id>New order</span></div>
      <div class="screen">
        <div class="row" style="gap:10px;min-height:26px"><svg class="spin" data-ico-spin hidden width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="3" stroke-dasharray="14 42" stroke-linecap="round"/></svg><svg data-ico-done hidden width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="11" fill="currentColor"/><path d="M7 12.5l3.2 3.2L17 9" fill="none" stroke="#ffffff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg><span role="status" aria-live="polite" data-label style="font-weight:500">Ready to pay</span></div>
        <div class="amt" data-amt></div>
        <div class="small muted" data-amt-note></div>
      </div>
      <div class="slot" aria-hidden="true"></div>
    </div>
    <div class="out"><article class="receipt" data-receipt hidden></article></div>
    <p class="small muted" data-after hidden style="margin:16px 7% 0">We also send this number to your phone by SMS. We start your order now.</p>
  </aside>
</div></section>
'''
    return page("checkout.html", "Payment | Endiro Coffee", "Pay for your Endiro order with MTN or Airtel Mobile Money through MUDA Pay, or with crypto.", body, ("checkout.js",), ("crypto-pay.css",))

def notfound():
    body = phead("Not found", "This page is not on the menu.", "The link may be old. Try the menu, or find a café.") + '<section class="sec-tight" style="padding-top:0"><div class="wrap row"><a class="btn btn-main" href="menu.html">Menu</a><a class="btn btn-line" href="cafes.html">Cafés</a></div></section>'
    return page("404.html", "Page not found | Endiro Coffee", "Page not found.", body)

PAGES = {"index.html": home, "about.html": about, "coffee.html": coffee, "cafes.html": cafes, "academy.html": academy,
         "journal.html": journal, "careers.html": careers, "wholesale.html": wholesale, "menu.html": menu,
         "checkout.html": checkout, "404.html": notfound}

if __name__ == "__main__":
    for name, fn in PAGES.items():
        out = fn()
        assert "\u2014" not in out, name + " has an em dash"
        open(os.path.join(ROOT, name), "w", encoding="utf-8").write(out)
        print("wrote", name, len(out))
