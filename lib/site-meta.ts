const donationUrl = process.env.NEXT_PUBLIC_DONATION_URL?.trim() || "https://paypal.me/cvk01";
const paypalDonateHostedButtonId =
  process.env.NEXT_PUBLIC_PAYPAL_DONATE_HOSTED_BUTTON_ID?.trim() || "MTTJHLG2P9GTC";
const paypalDonateBusiness = process.env.NEXT_PUBLIC_PAYPAL_DONATE_BUSINESS?.trim() || "";
const donationMode = paypalDonateHostedButtonId || paypalDonateBusiness ? "paypal-sdk" : "link";

export const siteMeta = {
  repoUrl: "https://github.com/cvkworld/elan-b2",
  donationUrl,
  paypalDonateHostedButtonId,
  paypalDonateBusiness,
  donationMode,
  donationReady: true,
  donationBadge: donationMode === "paypal-sdk" ? "PayPal checkout" : "PayPal.Me",
  donationLabel: donationMode === "paypal-sdk" ? "Faire un don" : "Faire un don via PayPal",
  donationHint:
    donationMode === "paypal-sdk"
      ? "Le bouton peut ouvrir le checkout PayPal avec PayPal ou carte selon le pays et les contrôles PayPal."
      : "Merci pour ton soutien. Le paiement passe pour l'instant par PayPal.Me."
};
