// pages/aice.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";

// Avatar (use HTTPS so it loads on an HTTPS page)
const AICE_AVATAR = "https://positivesoul.ai/wp-content/uploads/2025/08/aice_contact.jpg";

// Typical Folkeskole ranges (can vary locally)
const SUBJECTS = [
  { key:"dansk", label:"Dansk", from:0, to:9 },
  { key:"matematik", label:"Matematik", from:0, to:9 },
  { key:"engelsk", label:"Engelsk", from:1, to:9 },
  { key:"tysk", label:"Tysk (2. fremmedsprog)", from:5, to:9 },
  { key:"fransk", label:"Fransk (2. fremmedsprog)", from:5, to:9 },
  { key:"historie", label:"Historie", from:3, to:9 },
  { key:"kristendom", label:"Kristendomskundskab", from:1, to:9 },
  { key:"naturteknologi", label:"Natur/teknologi", from:1, to:6 },
  { key:"biologi", label:"Biologi", from:7, to:9 },
  { key:"geografi", label:"Geografi", from:7, to:9 },
  { key:"fysik-kemi", label:"Fysik/kemi", from:7, to:9 },
  { key:"samfundsfag", label:"Samfundsfag", from:8, to:9 },
  { key:"idraet", label:"Idræt", from:1, to:9 },
  { key:"musik", label:"Musik", from:1, to:6 },
  { key:"musik-valgfag", label:"Musik (valgfag)", from:7, to:9 },
  { key:"billedkunst", label:"Billedkunst", from:1, to:5 },
  { key:"billedkunst-valgfag", label:"Billedkunst (valgfag)", from:7, to:9 },
  { key:"haandvaerk-design", label:"Håndværk & design", from:4, to:7 },
  { key:"madkundskab", label:"Madkundskab", from:4, to:7 },
  { key:"10-dansk", label:"10. kl. Dansk", from:10, to:10 },
  { key:"10-matematik"
