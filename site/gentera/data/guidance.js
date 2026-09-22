// Management guidance for the Gentera model. Gentera publishes numeric guidance with the 4Q release (February)
// and reaffirms or revises it with the 1Q and 2Q releases. One entry per vintage, in date order, with the
// source. Ranges are as printed; `text` keeps the wording. Metrics: eps (Ps.), loanGrowth (%), opexGrowth (%),
// npl (stage-3 ratio, %), netIncomeGrowth (%). A metric with lo = null is one the release discussed without a
// number (or one still to be transcribed from the archived PDF by the harvester's guidance parser).
window.G_GUIDANCE = {
  updatedAt: "2026-09-22",
  basis: "Full-year figures; growth vs the prior fiscal year; stage-3 ratio as a year-end level; EPS on controlling net income and 1,579.2 M shares.",
  metrics: ["eps", "loanGrowth", "opexGrowth", "npl"],
  vintages: [
    {
      fy: 2026, kind: "initial", date: "2026-02-19", quarter: "2025Q4",
      source: { url: "https://www.gentera.com.mx/gentera/relacion-inversionistas/informacion_trimestral", date: "2026-02-19", title: { es: "Informe 4T25 y guía 2026 (febrero de 2026)", en: "4Q25 release and 2026 guidance (February 2026)" }, dateApprox: true },
      items: {
        eps: { lo: 5.88, hi: 6.03, text: { es: "Utilidad por acción 2026 entre Ps. 5.88 y Ps. 6.03 (+13% a +16% sobre Ps. 5.20 de 2025).", en: "2026 EPS between Ps. 5.88 and Ps. 6.03 (+13% to +16% on 2025's Ps. 5.20)." } },
        loanGrowth: { lo: null, hi: null, text: { es: "Crecimiento de cartera de doble dígito bajo; rango inicial por confirmar en el PDF del 4T25 (el parser de guía lo llenará).", en: "Low double-digit loan growth; initial range to be confirmed from the 4Q25 PDF (the guidance parser will fill it)." } },
        opexGrowth: { lo: 12, hi: 13, text: { es: "Gastos de administración y promoción +12% a +13%.", en: "Administrative and promotional expenses +12% to +13%." } },
        npl: { lo: 3.5, hi: 4.5, text: { es: "Índice de etapa 3 consolidado alrededor de 4% con la mezcla actual (más crédito individual).", en: "Consolidated stage-3 ratio around 4% with the current mix (more individual loans)." } },
      },
      notes: { es: ["La guía 2026 se apoya en un menor costo de fondeo (recortes de Banxico), crecimiento de doble dígito en Perú y ConCrédito y contención de gastos."], en: ["2026 guidance rests on lower funding cost (Banxico cuts), double-digit growth in Perú and ConCrédito and expense containment."] },
    },
    {
      fy: 2026, kind: "reaffirmed", date: "2026-04-22", quarter: "2026Q1",
      source: { url: "https://www.gentera.com.mx/gentera/relacion-inversionistas/informacion_trimestral", date: "2026-04-22", title: { es: "Informe 1T26 (abril de 2026)", en: "1Q26 release (April 2026)" }, dateApprox: true },
      items: {
        eps: { lo: 5.88, hi: 6.03, text: { es: "Reiterada: Ps. 5.88–6.03.", en: "Reaffirmed: Ps. 5.88–6.03." } },
        loanGrowth: { lo: null, hi: null, text: { es: "Sin cambio respecto a la guía inicial.", en: "Unchanged from the initial guidance." } },
        opexGrowth: { lo: 12, hi: 13, text: { es: "Sin cambio.", en: "Unchanged." } },
        npl: { lo: 3.5, hi: 4.5, text: { es: "Alrededor de 4%.", en: "Around 4%." } },
      },
      notes: { es: ["Con el informe del 1T26 se anunció también la propuesta de elevar la política de dividendos hasta 45% de la utilidad neta (asamblea extraordinaria del 22 de abril de 2026)."], en: ["The 1Q26 release also announced the proposal to lift the dividend policy to up to 45% of net income (extraordinary meeting of 22 April 2026)."] },
    },
    {
      fy: 2026, kind: "revised", date: "2026-07-22", quarter: "2026Q2",
      source: { url: "https://www.gentera.com.mx/gentera/relacion-inversionistas/informacion_trimestral", date: "2026-07-22", title: { es: "Informe 2T26 (julio de 2026)", en: "2Q26 release (July 2026)" }, dateApprox: true },
      items: {
        eps: { lo: 5.88, hi: 6.03, text: { es: "Reiterada: Ps. 5.88–6.03 (1S26: Ps. 2.98).", en: "Reaffirmed: Ps. 5.88–6.03 (1H26: Ps. 2.98)." } },
        loanGrowth: { lo: 6, hi: 9, text: { es: "Recortada a 6%–9% tras un segundo trimestre plano en Banco Compartamos (originación más estricta).", en: "Trimmed to 6%–9% after a flat second quarter at Banco Compartamos (tighter origination)." } },
        opexGrowth: { lo: null, hi: 12, text: { es: "Ahora por debajo de ~12% (1S26: +9.0%).", en: "Now below ~12% (1H26: +9.0%)." } },
        npl: { lo: 3.5, hi: 4.5, text: { es: "Alrededor de 4%; 2T26 en 4.04%.", en: "Around 4%; 2Q26 at 4.04%." } },
      },
      notes: { es: ["La administración privilegia la calidad de la cartera sobre el crecimiento: el banco se contrajo 1.5% en el trimestre con la etapa 3 individual en 6.12%."], en: ["Management is prioritising asset quality over growth: the bank shrank 1.5% in the quarter with individual-loan stage 3 at 6.12%."] },
    },
  ],
};
