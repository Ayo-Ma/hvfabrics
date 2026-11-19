import { formatMoney, type Money } from "@hv/core";

/**
 * The shop's public details, from the owner's questionnaire (2026-11-19). One source for every page.
 * Private details from the same questionnaire (bank, ID) never go here: the repo is public.
 */
export const SHOP = {
  name: "Harries Vogue",
  years: 8,
  hours: "9am to 6pm",
  shops: [
    { id: "ilorin", city: "Ilorin", address: "Beckadims Resort, Tanke Oke Odo, Ilorin" },
    { id: "abeokuta", city: "Abeokuta", address: "Odo Eran, Obantoko, Abeokuta" },
  ],
  phone: { display: "0811 820 6598", tel: "+2348118206598" },
  whatsapp: "https://wa.me/2348118206598",
  email: "harriesvogueglobal@gmail.com",
  socials: [
    { label: "Instagram", handle: "@harries_vogue_fabrics", url: "https://www.instagram.com/harries_vogue_fabrics" },
    { label: "Facebook", handle: "Harries_vogue_fabrics", url: "https://www.facebook.com/harries_vogue_fabrics" },
    { label: "TikTok", handle: "@harries_vogue", url: "https://www.tiktok.com/@harries_vogue" },
  ],
  /** Orders paid before this go out the same day. */
  sameDayCutoff: "10am",
} as const;

/** "Ilorin and Abeokuta" */
export const SHOP_CITIES = SHOP.shops.map((s) => s.city).join(" and ");

/** Pickup at a shop is free; every other zone shows its fee ([TBC] while a fee is still unset). */
export function feeLabel(zone: { id: string; fee: Money }): string {
  if (zone.id.startsWith("pickup")) return "Free";
  return zone.fee.amount ? formatMoney(zone.fee) : "[TBC]";
}
