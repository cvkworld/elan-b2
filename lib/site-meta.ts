const donationUrl = process.env.NEXT_PUBLIC_DONATION_URL?.trim() || "https://paypal.me/cvk01";

export const siteMeta = {
  repoUrl: "https://github.com/cvkworld/elan-b2",
  donationUrl,
  donationReady: true,
  donationLabel: donationUrl.includes("paypal.me") ? "Faire un don via PayPal" : "Faire un don",
  donationHint:
    "Chaque don arrive sur ton compte PayPal, puis tu peux le garder sur PayPal ou le transférer vers ta banque."
};
