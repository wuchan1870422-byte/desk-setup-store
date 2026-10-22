export type DeskFitInput = { clearWidthMm: number; cableCount: number; portable: boolean };
export function recommendKit(input: DeskFitInput) {
  if (!Number.isFinite(input.clearWidthMm) || input.clearWidthMm < 100 || input.clearWidthMm > 5000 || !Number.isSafeInteger(input.cableCount) || input.cableCount < 0 || input.cableCount > 100) throw new Error("Enter a clear width from 100 to 5,000 mm and 0–100 cables.");
  const slugs: string[] = [];
  const notes: string[] = [];
  if (input.cableCount > 0) {
    slugs.push("cable-keeper");
    notes.push(input.cableCount > 5 ? "The illustrative holder has five slots. Reduce your active cables or measure a different holder before buying." : "Check cable diameters and your desk surface before choosing a holder.");
  }
  if (input.portable) { slugs.push("tech-pouch"); notes.push("Lay out your charger and cables first. The pouch dimensions are an unverified concept, so fit cannot be guaranteed."); }
  if (input.clearWidthMm >= 550 && !input.portable) { slugs.push("desk-shelf"); notes.push("The shelf concept is 500 mm wide. Leave clearance, verify depth and test the load rating before putting a display on it."); }
  if (!slugs.length) notes.push("Start by moving unused accessories off your desk. You may not need an organiser.");
  return { slugs, notes, verified: false as const };
}
