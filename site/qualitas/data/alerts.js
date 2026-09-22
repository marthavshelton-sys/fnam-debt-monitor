// Alert thresholds for the Quálitas model. One source for two consumers:
//   * the page: evaluates them at load (share move, latest-quarter ratios, solvency, ROE, expectation tracking,
//     10-year yield) and shows a banner; the reader can override them locally in section 11 (browser only);
//   * the weekday reviewing routine (tools/qualitas/ROUTINE.md): emails the owner when one is crossed, in
//     addition to the calendar events (new quarter, new expectations, corporate events).
// Owner-set; edit by reviewed commit and bump updatedAt.
window.Q_ALERTS = {
  updatedAt: "2026-09-22",
  thresholds: {
    shareMovePct1d: { value: 5, es: "Movimiento diario de Q* mayor a ±5%", en: "Daily move in Q* larger than ±5%" },
    shareMovePct5d: { value: 10, es: "Movimiento de Q* en cinco días hábiles mayor a ±10%", en: "Five-day move in Q* larger than ±10%" },
    combinedRatioMaxPct: { value: 96, es: "Índice combinado trimestral por encima de 96%", en: "Quarterly combined ratio above 96%" },
    lossRatioMaxPct: { value: 68, es: "Índice de siniestralidad trimestral por encima de 68%", en: "Quarterly loss ratio above 68%" },
    solvencyIndexMinPct: { value: 200, es: "Índice de solvencia por debajo de 200%", en: "Solvency index below 200%" },
    roe12MinPct: { value: 15, es: "ROE 12M por debajo de 15%", en: "12M ROE below 15%" },
    guidanceTracking: { value: 1, es: "Alguna expectativa vigente peor que su rango en el acumulado reportado (1 = activo)", en: "Any expectation in force tracking worse than its range on the reported year-to-date (1 = on)" },
    mx10yMoveBp1w: { value: 50, es: "Bono M 10 años: ±50 pb en una semana", en: "10-year M bond: ±50 bp in a week" },
  },
};
