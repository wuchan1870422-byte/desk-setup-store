"""Reproducible first-party vector demo assets. No third-party photos or assets."""
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "public" / "images"
OUT.mkdir(parents=True, exist_ok=True)
DEFS = '''<defs>
<linearGradient id="bg" x2="1" y2="1"><stop stop-color="#f0eee6"/><stop offset="1" stop-color="#dddcd1"/></linearGradient>
<linearGradient id="oak" x2="0" y2="1"><stop stop-color="#d6b78c"/><stop offset=".5" stop-color="#c7a273"/><stop offset="1" stop-color="#bc9564"/></linearGradient>
<linearGradient id="oakside" x2="0" y2="1"><stop stop-color="#b28c5d"/><stop offset="1" stop-color="#947044"/></linearGradient>
<linearGradient id="sage" x2="0" y2="1"><stop stop-color="#a4b096"/><stop offset="1" stop-color="#708064"/></linearGradient>
<linearGradient id="sand" x2="0" y2="1"><stop stop-color="#d8ccb8"/><stop offset="1" stop-color="#b4a387"/></linearGradient>
<linearGradient id="screen" x2="1" y2="1"><stop stop-color="#cdd3c0"/><stop offset=".5" stop-color="#bec8ac"/><stop offset="1" stop-color="#939e84"/></linearGradient>
<linearGradient id="dark" x2="1" y2="1"><stop stop-color="#41483e"/><stop offset="1" stop-color="#242d26"/></linearGradient>
<linearGradient id="wall" x2="1" y2=".6"><stop stop-color="#ece9df"/><stop offset="1" stop-color="#dddccf"/></linearGradient>
<linearGradient id="desk" x2=".5" y2="1"><stop stop-color="#e5dbca"/><stop offset="1" stop-color="#cfc1ab"/></linearGradient>
<filter id="shadow" x="-50%" y="-80%" width="210%" height="280%"><feGaussianBlur stdDeviation="13"/></filter>
<filter id="smallshadow" x="-40%" y="-70%" width="200%" height="250%"><feGaussianBlur stdDeviation="5"/></filter>
<pattern id="fabric" width="4" height="4" patternUnits="userSpaceOnUse"><path d="M0 0h4M0 2h4M0 0v4M2 0v4" stroke="#8e7e64" stroke-width=".25" opacity=".25"/></pattern>
<pattern id="grain" width="110" height="14" patternUnits="userSpaceOnUse"><path d="M0 4c34-4 50 7 110 0M0 10c32 4 65-5 110 0" fill="none" stroke="#8c6a43" stroke-width=".7" opacity=".14"/></pattern>
</defs>'''

def svg(name, content, view="0 0 700 560", title="Demo product illustration"):
    (OUT / name).write_text(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{view}" role="img"><title>{title}</title>{DEFS}{content}</svg>')

svg("cable-keeper.svg", '''
<rect width="700" height="560" fill="#eeede7"/>
<path d="M-20 80 720 420M-20 160 720 500" stroke="#fff" stroke-width="55" opacity=".22"/>
<ellipse cx="361" cy="355" rx="207" ry="27" fill="#747963" opacity=".18" filter="url(#shadow)"/>
<path d="M200 286c-45-5-87 16-82 60s70 54 92 87" stroke="#dedbd0" stroke-width="12" fill="none"/>
<path d="M499 299c78-1 81-63 37-72s-80 30-34 46 83-19 101-68" stroke="#eeeae0" stroke-width="12" fill="none"/>
<path d="M231 261h283c21 0 38 15 38 34v24c0 25-20 44-46 44H221c-28 0-48-17-48-39v-25c0-21 27-38 58-38Z" fill="#687c5c"/>
<path d="m215 226 288 13c26 1 49 24 49 51s-21 44-48 44l-283-7c-27-1-48-22-48-49s17-53 42-52Z" fill="url(#sage)"/>
<path d="m213 230 288 13" stroke="#c6ceba" stroke-width="3" opacity=".6"/>
<g fill="#506447" stroke="#bec9b1" stroke-width="1"><rect x="231" y="238" width="17" height="65" rx="8" transform="rotate(3 239 270)"/><rect x="285" y="241" width="17" height="65" rx="8" transform="rotate(3 293 270)"/><rect x="339" y="244" width="17" height="65" rx="8" transform="rotate(3 347 270)"/><rect x="393" y="247" width="17" height="65" rx="8" transform="rotate(3 401 270)"/><rect x="447" y="250" width="17" height="65" rx="8" transform="rotate(3 455 270)"/></g>
<path d="M239 275c-3-57 1-99 15-136M348 277c6-50 10-85 25-119M457 283c8-53 18-80 39-113" fill="none" stroke="#edeee6" stroke-width="10"/>
<path d="M239 274c-3-56 1-98 15-135M348 276c6-49 10-84 25-118M457 282c8-52 18-79 39-112" fill="none" stroke="#fff" stroke-width="2" opacity=".55"/>
<g fill="#cacdc1"><rect x="248" y="116" width="16" height="30" rx="4" transform="rotate(17 255 130)"/><rect x="367" y="137" width="16" height="27" rx="4" transform="rotate(20 375 150)"/><rect x="489" y="151" width="16" height="27" rx="4" transform="rotate(24 497 165)"/></g>
<g fill="#9aa38f"><rect x="255" y="111" width="7" height="12" rx="1" transform="rotate(17 258 115)"/><rect x="375" y="132" width="7" height="12" rx="1" transform="rotate(20 378 138)"/><rect x="498" y="146" width="7" height="12" rx="1" transform="rotate(24 502 150)"/></g>
''', title="The Cable Keeper — fictional sage five-slot holder")

svg("desk-shelf.svg", '''
<rect width="700" height="560" fill="#eeede7"/>
<path d="m-40 130 780 340" stroke="#fff" stroke-width="80" opacity=".23"/>
<ellipse cx="354" cy="397" rx="250" ry="28" fill="#4c503d" opacity=".18" filter="url(#shadow)"/>
<path d="m171 282 31-17 3 126-31 13Z" fill="#2a312a"/><path d="m173 281 27 8 5 102-31 13Z" fill="#3d4539"/>
<path d="m523 258 28 7-1 116-30-6Z" fill="#2b322b"/><path d="m551 265 22-11-1 118-22 9Z" fill="#485044"/>
<path d="m117 242 335-82 149 73-333 93Z" fill="url(#oak)"/>
<path d="m117 242 151 84v24l-151-84Z" fill="#ae8659"/>
<path d="m268 326 333-93v23l-333 94Z" fill="url(#oakside)"/>
<path d="m117 242 335-82 149 73-333 93Z" fill="url(#grain)"/>
<path d="m120 243 148 81 329-91" fill="none" stroke="#e5c69b" stroke-width="2"/>
<g transform="translate(6 -2)"><path d="m252 216 119-28 82 38-117 31Z" fill="#464c41" opacity=".18" filter="url(#smallshadow)"/><path d="m264 207 108-25 67 34-108 27Z" fill="#e9e7db"/><path d="m264 207 67 36v7l-67-36Z" fill="#c5c6b8"/><path d="m331 243 108-27v7l-108 27Z" fill="#cfd0c3"/><path d="m285 207 80-19M296 214l80-19M307 221l80-19" stroke="#bec5b1" stroke-width="2"/></g>
<path d="m255 362 128-36 106 43-127 39Z" fill="#515b49" opacity=".1"/>
''', title="The Desk Shelf — fictional oak-look shelf with charcoal legs")

svg("tech-pouch.svg", '''
<rect width="700" height="560" fill="#eeede7"/>
<path d="m-20 60 760 360" stroke="#fff" stroke-width="75" opacity=".2"/>
<ellipse cx="352" cy="390" rx="193" ry="25" fill="#6d614d" opacity=".2" filter="url(#shadow)"/>
<path d="m211 221 209-44c44-9 88 14 97 54l27 106c7 30-10 51-42 61l-202 42c-39 9-74-13-85-48l-35-109c-9-27 3-52 31-62Z" fill="#9c8e76"/>
<path d="m207 194 211-43c42-9 87 13 99 48l22 77c8 30-11 60-40 67l-207 44c-42 9-78-12-90-48l-28-78c-10-30 4-59 33-67Z" fill="url(#sand)"/>
<path d="m207 194 211-43c42-9 87 13 99 48l22 77c8 30-11 60-40 67l-207 44c-42 9-78-12-90-48l-28-78c-10-30 4-59 33-67Z" fill="url(#fabric)"/>
<path d="m200 216 219-43c33-6 66 12 75 40l22 69c6 20-6 40-28 45l-198 42c-31 7-60-10-70-39l-26-74c-7-18-5-31 6-40Z" fill="none" stroke="#86785f" stroke-width="5"/>
<path d="m201 214 218-43c33-6 67 12 76 41l22 70c6 20-6 40-28 45l-198 42" fill="none" stroke="#ebe0cb" stroke-width="1.8" stroke-dasharray="2 3"/>
<path d="m239 345 7 23 17-3-8-24Z" fill="#4c5145"/><rect x="240" y="363" width="18" height="38" rx="5" fill="#4a5144" transform="rotate(-16 249 380)"/><path d="M250 372v17" stroke="#929982" stroke-width="3"/>
<g transform="translate(364 253) rotate(-13)"><rect x="-35" y="-17" width="70" height="34" rx="4" fill="#c2b093" stroke="#b6a386"/><path d="M-17-2h34M-11 5h22" stroke="#8e816a" stroke-width="1.3"/></g>
<path d="m500 259 38-8 8 16-38 9" fill="none" stroke="#99896e" stroke-width="7"/>
''', title="The Tech Pouch — fictional sand woven zip pouch")

SCENE = '''
<rect width="1000" height="1000" fill="url(#wall)"/>
<path d="M0 0h270L1000 800v200H730L0 200Z" fill="#fffdf3" opacity=".25"/>
<path d="M390 0h80l530 560v84Z" fill="#fffdf4" opacity=".27"/>
<path d="M0 565 1000 495v505H0Z" fill="url(#desk)"/>
<path d="M0 565 1000 495" stroke="#b7b49f" stroke-width="3" opacity=".4"/>
<path d="M70 680 870 535 1000 635v310L345 1000Z" fill="#8b8b70" opacity=".1"/>
<ellipse cx="494" cy="765" rx="355" ry="40" fill="#69705a" opacity=".17" filter="url(#shadow)"/>
<!-- Monitor and its shadow -->
<path d="m296 534 300-28 128 161-346 24Z" fill="#8a8c74" opacity=".17" filter="url(#shadow)"/>
<path d="m470 453 82-7 7 144-85 11Z" fill="#a5a997"/>
<path d="m439 580 161-17 65 31-166 22Z" fill="#bec0af"/>
<path d="m220 224 426-25c20-1 29 11 29 28v280c0 19-10 29-26 32l-417 39c-18 2-30-11-30-31V253c0-17 5-28 18-29Z" fill="#293229"/>
<path d="m216 239 443-27v301l-443 40Z" fill="url(#screen)"/>
<path d="M216 459c114-98 192-103 264-34 65 62 111 3 179-45v133l-443 40Z" fill="#a4b094"/>
<path d="M216 511c77-38 145-8 216-38 96-41 149-10 227-7v47l-443 40Z" fill="#788e6f"/>
<path d="M216 538c95-19 170-4 243-30 62-22 132-13 200-25v30l-443 40Z" fill="#6a8060"/>
<ellipse cx="575" cy="303" rx="27" ry="28" fill="#e5e6cd" opacity=".7"/>
<path d="m220 224 426-25" stroke="#5b6351" stroke-width="3"/>
<!-- Shelf -->
<path d="m218 649 28-6 5 102-30 10Z" fill="#303a2c"/>
<path d="m707 607 25 5 3 103-29-6Z" fill="#303a2c"/>
<path d="m165 610 452-66 169 60-452 85Z" fill="url(#oak)"/>
<path d="m165 610 169 79v22l-169-78Z" fill="#ad8657"/>
<path d="m334 689 452-85v22l-452 85Z" fill="url(#oakside)"/>
<path d="m165 610 452-66 169 60-452 85Z" fill="url(#grain)"/>
<path d="m168 610 166 77 447-83" stroke="#e6c79d" fill="none" stroke-width="2"/>
<!-- keyboard -->
<ellipse cx="425" cy="797" rx="194" ry="19" fill="#69725a" opacity=".15" filter="url(#smallshadow)"/>
<path d="m237 757 267-37 127 57-266 47Z" fill="#d4d4c4"/>
<path d="m237 757 128 67v9l-128-66Z" fill="#b7bba8"/>
<path d="m365 824 266-47v9l-266 47Z" fill="#c5c9b5"/>
<g stroke="#b1b8a2" stroke-width="4" opacity=".8"><path d="m261 757 237-33M277 769l237-35M294 781l238-38M311 792l238-39M328 805l238-41"/><path d="m294 753 69 47m-43-51 70 47m-42-51 70 46m-42-51 69 46m-42-50 69 45m-42-49 69 43m-42-48 69 44m-42-48 69 43"/></g>
<!-- mouse -->
<ellipse cx="703" cy="775" rx="41" ry="18" fill="#647151" opacity=".17" filter="url(#smallshadow)"/>
<path d="M666 766c-10-18 4-44 20-50 17-7 47 5 52 28 5 20-16 40-35 41-17 2-30-6-37-19Z" fill="#e0e0d0"/>
<path d="m685 725 11 19" stroke="#c2c6b2" stroke-width="2"/>
<!-- Cable holder on near left -->
<ellipse cx="175" cy="865" rx="86" ry="15" fill="#647253" opacity=".2" filter="url(#smallshadow)"/>
<path d="m101 825 132-21 43 24-132 26Z" fill="#96a580"/>
<path d="m101 825 43 29v23l-43-27Z" fill="#71845e"/>
<path d="m144 854 132-26v22l-132 27Z" fill="#81946d"/>
<g stroke="#5c744a" stroke-width="7" stroke-linecap="round"><path d="m129 825 22 16m5-20 22 15m5-20 22 15m5-20 22 15m5-20 22 15"/></g>
<path d="M152 835c-22-44-93-45-93-85s38-48 45-75M206 825c-10-25-49-47-37-80" fill="none" stroke="#f1efe0" stroke-width="6"/>
<!-- Tech pouch -->
<ellipse cx="825" cy="863" rx="124" ry="24" fill="#736b54" opacity=".18" filter="url(#shadow)"/>
<path d="m758 766 118-17c24-4 46 9 53 31l22 63c6 18-4 35-23 39l-126 23c-25 4-44-11-50-31l-18-60c-6-22 3-43 24-48Z" fill="#a89b81"/>
<path d="m752 750 120-17c24-4 46 9 53 30l21 60c6 18-5 34-24 38l-126 24c-25 4-44-11-50-31l-18-58c-6-20 4-41 24-46Z" fill="url(#sand)"/>
<path d="m752 750 120-17c24-4 46 9 53 30l21 60c6 18-5 34-24 38l-126 24c-25 4-44-11-50-31l-18-58c-6-20 4-41 24-46Z" fill="url(#fabric)"/>
<path d="m750 763 121-18c19-3 37 9 42 25l18 52c4 13-3 25-18 28l-116 22c-18 3-35-8-40-23l-17-50c-6-17-1-30 10-36Z" fill="none" stroke="#8d8066" stroke-width="3"/>
<rect x="800" y="798" width="44" height="21" rx="2" fill="#c2b297" transform="rotate(-10 822 808)"/>
<path d="m770 855 7 31" stroke="#4c5543" stroke-width="7" stroke-linecap="round"/>
<!-- Plant to right -->
<ellipse cx="877" cy="629" rx="65" ry="17" fill="#69775b" opacity=".18" filter="url(#smallshadow)"/>
<path d="m836 550 78-9-7 80c-1 19-52 26-57 6Z" fill="#bfc1ad"/>
<ellipse cx="875" cy="547" rx="40" ry="15" fill="#d1d0be"/>
<ellipse cx="875" cy="547" rx="31" ry="9" fill="#6d6d50"/>
<path d="M877 545c7-76-11-145-34-184m35 145c23-42 48-67 72-81m-72 66c-29-26-56-45-77-45m73-6c9-43 28-73 49-93" fill="none" stroke="#657548" stroke-width="5"/>
<g fill="#7d8d56"><ellipse cx="834" cy="373" rx="17" ry="45" transform="rotate(-35 834 373)"/><ellipse cx="912" cy="374" rx="16" ry="40" transform="rotate(35 912 374)"/><ellipse cx="815" cy="445" rx="17" ry="42" transform="rotate(-65 815 445)"/><ellipse cx="933" cy="433" rx="16" ry="43" transform="rotate(55 933 433)"/></g>
<g fill="#5d7445"><ellipse cx="852" cy="420" rx="14" ry="39" transform="rotate(-31 852 420)"/><ellipse cx="897" cy="470" rx="14" ry="36" transform="rotate(30 897 470)"/></g>
<!-- cup on shelf -->
<ellipse cx="251" cy="616" rx="32" ry="11" fill="#7c795b" opacity=".2" filter="url(#smallshadow)"/>
<path d="M226 559h44l-3 49c-2 13-35 14-38 0Z" fill="#e2dfcf"/>
<ellipse cx="248" cy="559" rx="22" ry="7" fill="#d0c8b3"/><ellipse cx="248" cy="560" rx="17" ry="4" fill="#705d43"/>
<path d="M270 571c25-9 27 28-1 26" fill="none" stroke="#d8d5c4" stroke-width="7"/>
'''
svg("desk-scene.svg", SCENE, "0 0 1000 1000", "Fictional calm workspace with three demo desk essentials")
svg("desk-detail.svg", '''
<rect width="800" height="650" fill="#d8ddcc"/>
<path d="M0 100 800 500M0 240 800 640" stroke="#f9f7e8" stroke-width="75" opacity=".18"/>
<path d="M-50 81 690-30l160 83-744 139Z" fill="url(#oak)"/>
<path d="M-50 81 106 192l744-139v25L106 218-50 108Z" fill="#ad8759"/>
<path d="m70 201 26 5 4 121-25-4Z" fill="#394431"/>
<ellipse cx="382" cy="422" rx="216" ry="38" fill="#657650" opacity=".19" filter="url(#shadow)"/>
<g transform="rotate(-17 380 365)"><rect x="220" y="250" width="280" height="270" rx="5" fill="#4d6144"/><rect x="230" y="252" width="270" height="256" rx="3" fill="#eeeadd"/><rect x="235" y="252" width="132" height="256" rx="2" fill="#f7f3e6"/><path d="M369 254v250" stroke="#d5cfbb" stroke-width="2"/><g stroke="#c8cbb7" stroke-width="1" opacity=".8"><path d="M253 291h96m-96 23h96m-96 23h96m-96 23h96m-96 23h96m-96 23h96m-96 23h96m-96 23h96M389 291h91m-91 23h91m-91 23h91m-91 23h91m-91 23h91m-91 23h91m-91 23h91m-91 23h91"/></g><path d="m362 252 4 268 13-9 7 5-6-264Z" fill="#a5af8c"/></g>
<path d="m559 309 12-4 49 179-12 4Z" fill="#bc925d"/><path d="m608 488 12-4-1 24Z" fill="#d7bd8c"/><path d="m616 501 3 7-5-2Z" fill="#3f4936"/>
<path d="M50 489c54-74 98-6 102 51s114 58 142 12" fill="none" stroke="#f1eddf" stroke-width="9"/>
<path d="m58 471 17 8-9 21-17-8Z" fill="#c8c9b8"/>
<ellipse cx="673" cy="211" rx="50" ry="17" fill="#657750" opacity=".18" filter="url(#smallshadow)"/>
<path d="m632 159 74-8-6 52c-3 20-57 25-61 4Z" fill="#e6e1d0"/><ellipse cx="669" cy="155" rx="37" ry="12" fill="#d5cbb7"/><ellipse cx="669" cy="156" rx="30" ry="8" fill="#6a5b42"/>
''', "0 0 800 650", "Illustrative notebook and cable in a calm desk workspace")

# Keep an SVG source for the share card; PNG is generated once for broad OG support.
svg("og-cover.svg", '''
<rect width="1200" height="630" fill="#f7f6f2"/>
<rect x="720" width="480" height="630" fill="#dfe5d8"/>
<g fill="#243b32"><rect x="70" y="55" width="8" height="29"/><rect x="84" y="43" width="8" height="41"/><rect x="98" y="62" width="8" height="22"/></g>
<text x="125" y="73" fill="#243b32" font-family="Arial" font-size="23">desk setup store</text>
<text x="70" y="230" fill="#243b32" font-family="Georgia" font-size="76">A little order.</text>
<text x="70" y="320" fill="#6d7c59" font-family="Georgia" font-style="italic" font-size="76">A clearer day.</text>
<text x="74" y="390" fill="#62685f" font-family="Arial" font-size="22">Desk and tech essentials for your everyday.</text>
<text x="74" y="537" fill="#62685f" font-family="Arial" font-size="17">AU / AUD · DEMO STORE · NO LIVE CHECKOUT</text>
<g transform="translate(620 115) scale(.82)"><path d="m117 242 335-82 149 73-333 93Z" fill="url(#oak)"/><path d="m117 242 151 84v24l-151-84Z" fill="#ae8659"/><path d="m268 326 333-93v23l-333 94Z" fill="url(#oakside)"/><path d="m171 282 31-17 3 126-31 13Z" fill="#2a312a"/><path d="m523 278 28-13-1 116-30-6Z" fill="#2b322b"/></g>
''', "0 0 1200 630", "Desk Setup Store — demo essentials")

if __name__ == "__main__":
    print("Wrote 6 first-party SVG illustrations.")
