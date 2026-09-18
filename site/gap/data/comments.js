// Hand-curated one-line explanations for the income-statement comparison (year-over-year only).
// Sources: GAP's quarterly results releases (GlobeNewswire / Form 6-K) and the earnings-call transcripts
// the repo owner supplied for 3Q25–2Q26. Keys: quarter id (2026Q2 = 2Q26 vs 2Q25), YTD id (2026M6 =
// 6M26 vs 6M25) or fiscal year (FY2025 vs FY2024). `call` names the earnings call used; the release link
// comes from financials.js. New quarters: the change-alert routine drafts entries from the new release;
// transcripts can be added afterwards. Percentages quoted are as printed by GAP; where GAP restated the
// prior-year base, the table (as originally reported) can differ slightly.
window.GAP_COMMENTS = {
  updatedAt: "2026-09-18",
  periods: {
    "2026Q2": {
      call: { date: "2026-07-15", es: "conferencia de resultados del 2T26 (15 jul 2026, transcripción Bloomberg)", en: "2Q26 earnings call (15 Jul 2026, Bloomberg transcript)" },
      lines: {
        revAero: { es: "Tráfico −5.6% y peso 10.9% más fuerte sobre los cargos en dólares; lo compensa en parte la aplicación gradual de la tarifa máxima 2025–29.", en: "Traffic −5.6% and a 10.9% stronger peso on USD-linked charges; partly offset by the phased 2025–29 maximum-tariff increases." },
        revNonAero: { es: "Dos meses de CBX (Ps. 468 M) y negocios operados por GAP +17% (carga y recinto fiscal +22%, publicidad +58%, hotel +27%); terceros −2.7%.", en: "Two months of CBX (Ps. 468 M) plus GAP-operated businesses +17% (cargo and bonded warehouse +22%, advertising +58%, hotel +27%); third-party lines −2.7%." },
        revCbx: { es: "Primera consolidación (may–jun): 626 mil usuarios a US$42.8 cada uno, en línea con lo esperado según la dirección.", en: "First consolidation (May–Jun): 626k users at US$42.8 each, in line with management's expectations." },
        revConstruction: { es: "Sin cambio: más obra en Jamaica (Kingston, +Ps. 181 M) compensa menos obra en México.", en: "Flat: more works in Jamaica (Kingston, +Ps. 181 M) offset lower works in Mexico." },
        revTotal: { es: "+4.9% sin IFRIC 12: comercial y CBX superan la caída de tráfico y el peso fuerte.", en: "+4.9% ex-IFRIC 12: commercial growth and CBX outweigh lower traffic and the stronger peso." },
        costServices: { es: "Más personal (incluye el equipo de asistencia técnica internalizado), mantenimiento de áreas nuevas y seguridad; Jamaica bajó. GAP reporta +23.2% sobre un 2T25 reexpresado.", en: "More personnel (incl. internalised technical-assistance staff), maintenance of new areas and security; Jamaica fell. GAP reports +23.2% against a restated 2Q25." },
        costEmployee: { es: "Personal de asistencia técnica internalizado, más personal operativo, ajustes salariales y prestaciones de la reforma laboral.", en: "Internalised technical-assistance staff, more airport staff, salary adjustments and Federal Labor Law benefits." },
        costMaintenance: { es: "Apertura de áreas operativas nuevas y mantenimiento de pistas.", en: "New operational areas and airfield maintenance." },
        costSecurity: { es: "Más personal de seguridad, aumento al salario mínimo y seguros de la mercancía en el recinto fiscal.", en: "More security headcount, minimum-wage rises and insurance on bonded-warehouse goods." },
        costOther: { es: "Provisión por pérdidas crediticias esperadas.", en: "Expected-credit-loss provision." },
        costCbx: { es: "Consolidado desde el 1 de mayo; el gasto total de CBX fue Ps. 177 M (Ps. 152 M en costo de servicios y Ps. 25 M de D&A).", en: "Consolidated from 1 May; total CBX opex was Ps. 177 M (Ps. 152 M in cost of services, Ps. 25 M D&A)." },
        techAssistance: { es: "Reversión de la provisión de la cuota de asistencia técnica (Ps. 486 M) al internalizar el servicio de AMP; la cuota dejó de pagarse desde mayo.", en: "Reversal of the technical-assistance fee provision (Ps. 486 M) after internalising AMP's service; no fee from May." },
        concessionTaxes: { es: "Menores ingresos en Montego Bay tras el huracán Melissa reducen el derecho de concesión de Jamaica (−20.8%).", en: "Lower Montego Bay revenue after Hurricane Melissa cuts Jamaica's concession fee (−20.8%)." },
        da: { es: "Activos de CBX (dos meses) y obras del PMD que entran en operación.", en: "CBX assets (two months) and MDP works entering service." },
        otherIncome: { es: "Incluye Ps. 118 M de gastos no recurrentes de la fusión con CBX.", en: "Includes Ps. 118 M of non-recurring merger-related expenses." },
        totalOpCosts: { es: "Sin cambio: la reversión de la provisión compensa el gasto de CBX, la fusión y el mayor costo de servicios; +3.0% excluyendo esos efectos.", en: "Flat: the provision reversal offsets CBX opex, merger costs and higher cost of services; +3.0% excluding those items." },
        opIncome: { es: "CBX aportó Ps. 291 M; margen sin IFRIC 12 de 57.9% vs 55.8%.", en: "CBX contributed Ps. 291 M; margin ex-IFRIC 12 57.9% vs 55.8%." },
        ebitda: { es: "CBX aportó Ps. 316 M (margen 67.5%) y se revirtió la asistencia técnica; Jamaica y el peso fuerte restan.", en: "CBX contributed Ps. 316 M (67.5% margin) and the technical-assistance reversal helped; Jamaica and the stronger peso weigh." },
        ebitdaMarginExIfric: { es: "+2.2 pp a 69.3%: internalización de la asistencia técnica y CBX.", en: "+2.2 pp to 69.3%: internalised technical assistance and CBX." },
        financialResult: { es: "Intereses pagados +37.6% por deuda para capex y el 25% de CBX; intereses ganados +54% por más efectivo; pérdida cambiaria menor (Ps. 17 M).", en: "Interest expense +37.6% on debt for capex and the 25% CBX stake; interest income +54% on higher cash; smaller FX loss (Ps. 17 M)." },
        incomeTax: { es: "Menor impuesto causado (−Ps. 138 M), compensado en parte por un menor beneficio diferido.", en: "Lower current tax (−Ps. 138 M), partly offset by a smaller deferred benefit." },
        netIncome: { es: "Crecimiento operativo y CBX absorben el mayor gasto financiero.", en: "Operating growth and CBX absorb the higher interest expense." },
        fxTranslation: { es: "Pérdida por conversión de las filiales jamaicanas (en dólares) con el peso apreciado; Ps. 20 M peor que en 2T25.", en: "Translation loss on the USD-based Jamaican subsidiaries with a stronger peso; Ps. 20 M worse than 2Q25." },
        comprehensiveIncome: { es: "Sigue a la utilidad antes de impuestos (+5.1%) con menor impuesto.", en: "Tracks pre-tax income (+5.1%) with lower tax." }
      }
    },
    "2026M6": {
      call: { date: "2026-07-15", es: "conferencia de resultados del 2T26 (15 jul 2026, transcripción Bloomberg)", en: "2Q26 earnings call (15 Jul 2026, Bloomberg transcript)" },
      lines: {
        revAero: { es: "La tarifa máxima 2025–29 compensa tráfico −3.7% en México, −20.8% en Jamaica y un peso 12.5% más fuerte.", en: "The tariff phase-in offsets traffic −3.7% in Mexico, −20.8% in Jamaica and a 12.5% stronger peso." },
        revNonAero: { es: "Negocios operados por GAP +18.7% en México y dos meses de CBX; Jamaica −20.8%.", en: "GAP-operated businesses +18.7% in Mexico plus two months of CBX; Jamaica −20.8%." },
        revConstruction: { es: "Menos obra en México (−6.6%), más en Jamaica (+191%).", en: "Less work in Mexico (−6.6%), more in Jamaica (+191%)." },
        revTotal: { es: "+4.7% sin IFRIC 12.", en: "+4.7% ex-IFRIC 12." },
        costServices: { es: "Personal (+18.2%: ajustes, personal operativo y de asistencia técnica), seguridad (+17.6%) y mantenimiento (+13.2%) en México; Jamaica −7.0%.", en: "Personnel (+18.2%: adjustments, operations and technical-assistance staff), security (+17.6%) and maintenance (+13.2%) in Mexico; Jamaica −7.0%." },
        techAssistance: { es: "Reversión de la provisión (Ps. 471 M); solo se reconoce la cuota fija de enero a abril.", en: "Provision reversal (Ps. 471 M); only the fixed fee for January–April is recognised." },
        concessionTaxes: { es: "Jamaica −27.5% por menores ingresos en Montego Bay; México ligeramente arriba.", en: "Jamaica −27.5% on lower Montego Bay revenue; Mexico slightly up." },
        da: { es: "Activos de CBX y obras nuevas (+Ps. 55 M).", en: "CBX assets and new works (+Ps. 55 M)." },
        otherIncome: { es: "Gastos no recurrentes de la fusión con CBX (Ps. 118 M).", en: "Non-recurring CBX merger expenses (Ps. 118 M)." },
        totalOpCosts: { es: "Sin cambio: reversión de la asistencia técnica y menor derecho de concesión frente a CBX, fusión y costo de servicios.", en: "Flat: technical-assistance reversal and lower concession fees against CBX, merger costs and cost of services." },
        opIncome: { es: "CBX aportó Ps. 291 M; margen sin IFRIC 12 57.8% vs 55.9%.", en: "CBX contributed Ps. 291 M; margin ex-IFRIC 12 57.8% vs 55.9%." },
        ebitda: { es: "Margen sin IFRIC 12 68.8% vs 67.1%; CBX Ps. 316 M.", en: "Margin ex-IFRIC 12 68.8% vs 67.1%; CBX Ps. 316 M." },
        ebitdaMarginExIfric: { es: "+1.7 pp: asistencia técnica internalizada y CBX.", en: "+1.7 pp: internalised technical assistance and CBX." },
        financialResult: { es: "Ganancia cambiaria de Ps. 156 M (pérdida de Ps. 164 M en 6M25) compensa intereses pagados +13.6% por más bonos y créditos.", en: "FX gain of Ps. 156 M (loss of Ps. 164 M in 6M25) offsets interest expense +13.6% on more bonds and loans." },
        incomeTax: { es: "+Ps. 69 M por mayor utilidad de operación.", en: "+Ps. 69 M on higher operating income." },
        netIncome: { es: "Mayor EBITDA, neto de más depreciación.", en: "Higher EBITDA net of more D&A." },
        fxTranslation: { es: "Ps. 90 M mejor que en 6M25.", en: "Ps. 90 M better than 6M25." },
        comprehensiveIncome: { es: "Sigue a la utilidad antes de impuestos (+10.0%).", en: "Tracks pre-tax income (+10.0%)." }
      }
    },
    "2026Q1": {
      call: { date: "2026-04-22", es: "conferencia de resultados del 1T26 (22 abr 2026, transcripción Bloomberg)", en: "1Q26 earnings call (22 Apr 2026, Bloomberg transcript)" },
      lines: {
        revAero: { es: "México +9.3% por la tarifa máxima 2025–29; Jamaica −26.2% tras el huracán Melissa y un peso 14.0% más fuerte.", en: "Mexico +9.3% on the 2025–29 tariffs; Jamaica −26.2% after Hurricane Melissa and a 14.0% stronger peso." },
        revNonAero: { es: "México +10.7% con negocios operados por GAP +19.9% (el recinto fiscal ya es ≈21% del no aeronáutico); Jamaica −24.7%; duty free afectado por el peso.", en: "Mexico +10.7% led by GAP-operated businesses (+19.9%; bonded warehouse now ≈21% of non-aero); Jamaica −24.7%; duty-free hit by the peso." },
        revConstruction: { es: "Menos obra en México (−6.6%), más en Jamaica.", en: "Less work in Mexico (−6.6%), more in Jamaica." },
        revTotal: { es: "+4.5% sin IFRIC 12 pese a tráfico −5.5% (hechos de seguridad en Jalisco, Melissa, recortes de capacidad por el combustible).", en: "+4.5% ex-IFRIC 12 despite traffic −5.5% (Jalisco security events, Melissa, airline capacity cuts on fuel costs)." },
        costServices: { es: "Más personal, personal de seguridad y salario mínimo, mantenimiento de áreas nuevas; Jamaica −12.7%. GAP reporta +6.5% sobre un 1T25 reexpresado.", en: "More personnel, security headcount and minimum wage, maintenance of new areas; Jamaica −12.7%. GAP reports +6.5% against a restated 1Q25." },
        costEmployee: { es: "Más personal, ajustes salariales y reforma laboral.", en: "More personnel, salary adjustments and Federal Labor Law." },
        costSecurity: { es: "Más personal de seguridad y aumento al salario mínimo.", en: "Security headcount and minimum-wage rises." },
        costMaintenance: { es: "Áreas operativas nuevas y pistas.", en: "New operational areas and airfield." },
        techAssistance: { es: "La cuota se sigue devengando hasta cerrar la combinación con CBX/AMP (prevista para el 2T26).", en: "Fee still accrued until the CBX/AMP combination closes (expected in 2Q26)." },
        concessionTaxes: { es: "Jamaica −33.7% por menores ingresos en Montego Bay; el derecho es un porcentaje de los ingresos.", en: "Jamaica −33.7% on lower Montego Bay revenue; the fee is revenue-linked." },
        da: { es: "Sin cambio: activos nuevos del PMD compensados por activos ya depreciados por completo (CFO en la conferencia).", en: "Flat: new MDP assets offset by items now fully depreciated (CFO on the call)." },
        totalOpCosts: { es: "Sin cambio: menor derecho de concesión e IFRIC 12 compensan el mayor costo de servicios.", en: "Flat: lower concession fees and IFRIC 12 offset higher cost of services." },
        opIncome: { es: "Margen sin IFRIC 12 57.6% vs 56.0%.", en: "Margin ex-IFRIC 12 57.6% vs 56.0%." },
        ebitda: { es: "Ps. 6.0 mil M; margen sin IFRIC 12 68.3% (+1.2 pp) por tarifas y control de costos.", en: "Ps. 6.0 bn; margin ex-IFRIC 12 68.3% (+1.2 pp) on tariffs and cost control." },
        ebitdaMarginExIfric: { es: "+1.2 pp: tarifas y control de costos.", en: "+1.2 pp: tariffs and cost control." },
        financialResult: { es: "Ganancia cambiaria de Ps. 173 M (pérdida de Ps. 124 M en 1T25); intereses pagados −5.7% por menores tasas; intereses ganados −47% por menor efectivo promedio.", en: "FX gain of Ps. 173 M (loss of Ps. 124 M in 1Q25); interest expense −5.7% on lower rates; interest income −47% on lower average cash." },
        incomeTax: { es: "Impuesto causado +Ps. 95 M.", en: "Current tax +Ps. 95 M." },
        netIncome: { es: "Mayor EBITDA y ganancias cambiarias.", en: "Higher EBITDA plus FX gains." },
        fxTranslation: { es: "Ganancia por conversión frente a una pérdida en 1T25 (mejora neta de Ps. 110 M).", en: "Translation gain vs a loss in 1Q25 (net Ps. 110 M improvement)." },
        comprehensiveIncome: { es: "Sigue a la utilidad antes de impuestos (+15.0%).", en: "Tracks pre-tax income (+15.0%)." }
      }
    },
    "2025Q4": {
      call: { date: "2026-02-25", es: "conferencia de resultados del 4T25 (25 feb 2026, transcripción Bloomberg)", en: "4Q25 earnings call (25 Feb 2026, Bloomberg transcript)" },
      lines: {
        revAero: { es: "México +21.2% por tarifas 2025–29 y tráfico +2.9%; Jamaica −35.7% por el huracán Melissa (tráfico −34.5%) y un peso 8.7% más fuerte.", en: "Mexico +21.2% on the 2025–29 tariffs and +2.9% traffic; Jamaica −35.7% after Hurricane Melissa (traffic −34.5%) and an 8.7% stronger peso." },
        revNonAero: { es: "México +19.5%: negocios operados por GAP +28.3% (carga y recinto fiscal), terceros +11.5% por espacios nuevos y contratos renegociados; Jamaica −29.5%.", en: "Mexico +19.5%: GAP-operated +28.3% (cargo and bonded warehouse), third-party +11.5% on new spaces and renegotiated contracts; Jamaica −29.5%." },
        revConstruction: { es: "Menor obra del PMD en el trimestre (México −29.9%).", en: "Lower MDP works in the quarter (Mexico −29.9%)." },
        revTotal: { es: "+12.8% sin IFRIC 12; el total reportado crece menos por la menor obra.", en: "+12.8% ex-IFRIC 12; the reported total is held back by lower construction revenue." },
        costServices: { es: "Pasarelas y autobuses ahora operados por GAP (cambio regulatorio), mantenimiento +55%, más personal, energía y Ps. 121 M de consultoría por adquisiciones.", en: "Jet bridges and airport buses now operated by GAP (regulatory change), maintenance +55%, more personnel, energy costs and Ps. 121 M consulting on acquisitions." },
        costMaintenance: { es: "Áreas nuevas, pistas y operación de pasarelas (Ps. 42 M).", en: "New areas, airfield and jet-bridge operation (Ps. 42 M)." },
        costOther: { es: "Ps. 121 M de consultoría en proyectos de adquisición (CBX, Motiva).", en: "Ps. 121 M consulting on acquisition projects (CBX, Motiva)." },
        costEmployee: { es: "Más personal, ajustes salariales y reforma laboral.", en: "More personnel, salary adjustments and Federal Labor Law." },
        costUtilities: { es: "Mayor costo de energía en México.", en: "Higher energy costs in Mexico." },
        techAssistance: { es: "La cuota a AMP es un porcentaje del EBITDA; se internaliza desde mayo de 2026.", en: "The fee to AMP is a % of EBITDA; internalised from May 2026." },
        concessionTaxes: { es: "Derecho en México al 9% de los ingresos (5% hasta 2024); Jamaica −54.4% tras Melissa.", en: "Mexican fee at 9% of revenue (5% until 2024); Jamaica −54.4% after Melissa." },
        da: { es: "Ligero aumento por activos nuevos.", en: "Slight rise on new assets." },
        opIncome: { es: "Margen sin IFRIC 12 51.8% vs 53.9%.", en: "Margin ex-IFRIC 12 51.8% vs 53.9%." },
        ebitda: { es: "Ps. 5.1 mil M; margen sin IFRIC 12 63.8% (−3.1 pp): derecho de concesión más alto, personal, pasarelas y Jamaica tras Melissa.", en: "Ps. 5.1 bn; margin ex-IFRIC 12 63.8% (−3.1 pp): higher concession fee, headcount, jet bridges and Jamaica after Melissa." },
        ebitdaMarginExIfric: { es: "−3.1 pp: derecho de concesión, personal y Jamaica.", en: "−3.1 pp: concession fee, headcount and Jamaica." },
        financialResult: { es: "Intereses pagados +33.6% por más deuda; intereses ganados −35.6% por menor efectivo y tasas.", en: "Interest expense +33.6% on higher debt; interest income −35.6% on lower cash and rates." },
        incomeTax: { es: "+Ps. 177 M: menos pérdidas fiscales aplicadas y menor ajuste por inflación.", en: "+Ps. 177 M: fewer tax-loss carryforwards applied and a lower inflation adjustment." },
        netIncome: { es: "Mayor gasto financiero, menores intereses ganados e impuesto diferido (CEO en la conferencia).", en: "Higher interest expense, lower interest income and deferred-tax adjustments (CEO on the call)." },
        fxTranslation: { es: "Pérdida por conversión Ps. 352 M mayor: apreciación del peso sobre las filiales jamaicanas.", en: "Ps. 352 M larger translation loss: peso appreciation on the Jamaican subsidiaries." },
        comprehensiveIncome: { es: "Menor utilidad neta y pérdida por conversión.", en: "Lower net income and the translation loss." }
      }
    },
    "FY2025": {
      call: { date: "2026-02-25", es: "conferencia de resultados del 4T25 (25 feb 2026, transcripción Bloomberg)", en: "4Q25 earnings call (25 Feb 2026, Bloomberg transcript)" },
      lines: {
        revAero: { es: "México +22.5%: tarifas nuevas desde marzo, tráfico +3.7% y peso promedio 5.1% más débil; Jamaica +2.9% (−2.0% en dólares).", en: "Mexico +22.5%: new tariffs from March, +3.7% traffic and a 5.1% weaker average peso; Jamaica +2.9% (−2.0% in USD)." },
        revNonAero: { es: "México +29.9%: negocios operados por GAP +58.1% (carga y recinto fiscal año completo, +167%), terceros +9.4%; ingreso no aeronáutico por pasajero Ps. 152 vs 123.", en: "Mexico +29.9%: GAP-operated +58.1% (cargo and bonded warehouse full year, +167%), third-party +9.4%; non-aero revenue per passenger Ps. 152 vs 123." },
        revConstruction: { es: "Primer año del PMD 2025–29.", en: "First year of the 2025–29 MDP." },
        revTotal: { es: "+21.4% sin IFRIC 12.", en: "+21.4% ex-IFRIC 12." },
        costServices: { es: "Personal +22.5%, mantenimiento +55% (pasarelas Ps. 168 M), consultoría de proyectos nuevos y año completo del negocio de carga.", en: "Personnel +22.5%, maintenance +55% (jet bridges Ps. 168 M), consulting on new projects and a full year of the cargo business." },
        costEmployee: { es: "Más personal, ajustes salariales, reforma laboral y negocio de carga (Ps. 149 M).", en: "More personnel, salary adjustments, Federal Labor Law and the cargo business (Ps. 149 M)." },
        costMaintenance: { es: "Áreas nuevas, pasarelas (Ps. 168 M) y negocio de carga.", en: "New areas, jet bridges (Ps. 168 M) and the cargo business." },
        costOther: { es: "Consultoría y honorarios por proyectos nuevos (Ps. 226 M).", en: "Consulting and professional fees on new projects (Ps. 226 M)." },
        techAssistance: { es: "Cuota a AMP ligada al EBITDA.", en: "Fee to AMP tracks EBITDA." },
        concessionTaxes: { es: "Derecho en México al 9% de los ingresos (5% en 2024).", en: "Mexican fee at 9% of revenue (5% in 2024)." },
        da: { es: "Valor razonable del negocio de carga y activos nuevos.", en: "Fair value of the cargo business and new assets." },
        opIncome: { es: "Margen sin IFRIC 12 54.0% vs 56.2%.", en: "Margin ex-IFRIC 12 54.0% vs 56.2%." },
        ebitda: { es: "Ps. 21.3 mil M; margen sin IFRIC 12 65.6% (−2.0 pp) por el derecho de concesión más alto.", en: "Ps. 21.3 bn; margin ex-IFRIC 12 65.6% (−2.0 pp) on the higher concession fee." },
        ebitdaMarginExIfric: { es: "−2.0 pp: derecho de concesión al 9%.", en: "−2.0 pp: concession fee at 9%." },
        financialResult: { es: "Intereses pagados +8.7% (más bonos y créditos); intereses ganados −20.5%; ganancia cambiaria de Ps. 87 M.", en: "Interest expense +8.7% (more bonds and loans); interest income −20.5%; FX gain of Ps. 87 M." },
        incomeTax: { es: "+Ps. 873 M, casi todo impuesto causado por mayor utilidad.", en: "+Ps. 873 M, mostly current tax on higher profit." },
        netIncome: { es: "Crecimiento del EBITDA, neto de mayor depreciación.", en: "EBITDA growth net of higher D&A." },
        fxTranslation: { es: "De ganancia de Ps. 1.1 mil M a pérdida de Ps. 1.0 mil M: el peso se apreció 13.8% al cierre (20.89 → 18.01).", en: "Swing from a Ps. 1.1 bn gain to a Ps. 1.0 bn loss: the peso appreciated 13.8% at year-end (20.89 → 18.01)." },
        comprehensiveIncome: { es: "La pérdida por conversión supera el mayor resultado neto.", en: "The translation loss outweighs the higher net income." }
      }
    },
    "2025Q3": {
      call: { date: "2025-10-21", es: "conferencia de resultados del 3T25 (21 oct 2025, transcripción Bloomberg)", en: "3Q25 earnings call (21 Oct 2025, Bloomberg transcript)" },
      lines: {
        revAero: { es: "México +20.5% por la tarifa máxima (15% en marzo y +7.5% desde el 1 de septiembre, adelantado de 2026); Jamaica +7.3%.", en: "Mexico +20.5% on the new maximum tariffs (15% in March, +7.5% from 1 September, brought forward from 2026); Jamaica +7.3%." },
        revNonAero: { es: "México +16.4%: negocios operados por GAP +30.5% (carga y recinto fiscal +Ps. 169 M), terceros +3.5%; Jamaica +9.8%.", en: "Mexico +16.4%: GAP-operated +30.5% (cargo and bonded warehouse +Ps. 169 M), third-party +3.5%; Jamaica +9.8%." },
        revConstruction: { es: "Más obra del PMD.", en: "More MDP works." },
        revTotal: { es: "+17.4% sin IFRIC 12.", en: "+17.4% ex-IFRIC 12." },
        costServices: { es: "Pasarelas y autobuses ahora operados por GAP (≈+4.8% sin este efecto), mantenimiento +52%, personal +11.7%.", en: "Jet bridges and airport buses now operated by GAP (≈+4.8% excluding this), maintenance +52%, employee costs +11.7%." },
        costMaintenance: { es: "Áreas nuevas, pistas y pasarelas (Ps. 48 M).", en: "New areas, airfield and jet bridges (Ps. 48 M)." },
        costEmployee: { es: "Ajustes salariales y reforma laboral.", en: "Salary adjustments and Federal Labor Law." },
        techAssistance: { es: "Cuota a AMP ligada al EBITDA.", en: "Fee to AMP tracks EBITDA." },
        concessionTaxes: { es: "Derecho en México al 9% (5% en 2024): con asistencia técnica, +Ps. 392 M.", en: "Mexican fee at 9% (5% in 2024): with technical assistance, +Ps. 392 M." },
        da: { es: "Valor razonable del negocio de carga y recinto fiscal.", en: "Fair values of the cargo and bonded-warehouse business." },
        opIncome: { es: "Margen sin IFRIC 12 52.5% vs 55.3%.", en: "Margin ex-IFRIC 12 52.5% vs 55.3%." },
        ebitda: { es: "Ps. 5.1 mil M; margen sin IFRIC 12 64.3% (−2.7 pp) por el derecho de concesión al 9% desde 2025.", en: "Ps. 5.1 bn; margin ex-IFRIC 12 64.3% (−2.7 pp) on the 9% concession fee since 2025." },
        ebitdaMarginExIfric: { es: "−2.7 pp: derecho de concesión al 9%.", en: "−2.7 pp: concession fee at 9%." },
        financialResult: { es: "Ganancia cambiaria de Ps. 61 M frente a pérdida de Ps. 313 M (peso apreciado); intereses pagados −12.8% por menores tasas; intereses ganados −34.8%.", en: "FX gain of Ps. 61 M vs a Ps. 313 M loss (peso appreciation); interest expense −12.8% on lower rates; interest income −34.8%." },
        incomeTax: { es: "+Ps. 115 M: menor ajuste por inflación, en parte compensado por Ps. 47 M de pérdidas fiscales.", en: "+Ps. 115 M: lower inflation adjustment, partly offset by Ps. 47 M of tax-loss carryforwards." },
        netIncome: { es: "Crecimiento del EBITDA y giro cambiario.", en: "EBITDA growth and the FX swing." },
        fxTranslation: { es: "Pérdida por conversión Ps. 874 M mayor: apreciación del peso sobre las filiales jamaicanas.", en: "Ps. 874 M larger translation loss: peso appreciation on the Jamaican subsidiaries." },
        comprehensiveIncome: { es: "Baja pese a utilidad neta +36%: pérdida por conversión.", en: "Down despite net income +36%: translation loss." }
      }
    },
    "2025M9": {
      call: { date: "2025-10-21", es: "conferencia de resultados del 3T25 (21 oct 2025, transcripción Bloomberg)", en: "3Q25 earnings call (21 Oct 2025, Bloomberg transcript)" },
      lines: {
        revAero: { es: "México +22.9%: tarifas desde marzo, peso promedio 10.3% más débil y tráfico +4.0%; Jamaica +15.9%.", en: "Mexico +22.9%: tariffs from March, a 10.3% weaker average peso and +4.0% traffic; Jamaica +15.9%." },
        revNonAero: { es: "México +34.0%: consolidación de carga y recinto fiscal (+Ps. 1,041 M), terceros +8.7%; Jamaica +17.2%.", en: "Mexico +34.0%: cargo and bonded-warehouse consolidation (+Ps. 1,041 M), third-party +8.7%; Jamaica +17.2%." },
        revConstruction: { es: "Obras del PMD 2025–29.", en: "MDP 2025–29 works." },
        revTotal: { es: "+24.6% sin IFRIC 12.", en: "+24.6% ex-IFRIC 12." },
        costServices: { es: "Personal +24.5%, mantenimiento +55% (pasarelas Ps. 132 M), otros gastos +26.5% y consolidación del negocio de carga.", en: "Personnel +24.5%, maintenance +55% (jet bridges Ps. 132 M), other expenses +26.5% and the cargo-business consolidation." },
        costEmployee: { es: "Ajustes salariales, reforma laboral y negocio de carga (Ps. 190 M).", en: "Salary adjustments, Federal Labor Law and the cargo business (Ps. 190 M)." },
        costMaintenance: { es: "Áreas nuevas, pasarelas (Ps. 132 M) y negocio de carga.", en: "New areas, jet bridges (Ps. 132 M) and the cargo business." },
        costOther: { es: "Consultoría y viajes (Ps. 69 M) y negocio de carga (Ps. 81 M).", en: "Consulting and travel (Ps. 69 M) and the cargo business (Ps. 81 M)." },
        techAssistance: { es: "Cuota a AMP ligada al EBITDA.", en: "Fee to AMP tracks EBITDA." },
        concessionTaxes: { es: "Derecho en México al 9% (5% en 2024).", en: "Mexican fee at 9% (5% in 2024)." },
        da: { es: "Valor razonable del negocio de carga y activos nuevos.", en: "Fair value of the cargo business and new assets." },
        opIncome: { es: "Margen sin IFRIC 12 54.8% vs 57.0%.", en: "Margin ex-IFRIC 12 54.8% vs 57.0%." },
        ebitda: { es: "Margen sin IFRIC 12 66.2% vs 67.9%.", en: "Margin ex-IFRIC 12 66.2% vs 67.9%." },
        financialResult: { es: "Ganancia cambiaria de Ps. 100 M; intereses pagados sin cambio; intereses ganados −13.7%.", en: "FX gain of Ps. 100 M; interest expense flat; interest income −13.7%." },
        incomeTax: { es: "+Ps. 697 M de impuesto causado.", en: "+Ps. 697 M of current tax." },
        netIncome: { es: "Mayor EBITDA, neto de más depreciación.", en: "Higher EBITDA net of more D&A." },
        fxTranslation: { es: "Pérdida por conversión Ps. 1.74 mil M mayor.", en: "Ps. 1.74 bn larger translation loss." },
        comprehensiveIncome: { es: "La pérdida por conversión compensa el mayor resultado neto.", en: "The translation loss offsets the higher net income." }
      }
    }
  }
};
