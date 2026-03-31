const donationUrl = process.env.NEXT_PUBLIC_DONATION_URL?.trim() ?? "";

export const siteMeta = {
  repoUrl: "https://github.com/cvkworld/elan-b2",
  donationUrl,
  donationReady: donationUrl.length > 0,
  donationHint:
    donationUrl.length > 0
      ? "Chaque don aide à financer de nouveaux sujets, un meilleur suivi et un futur vrai compteur multi-appareils."
      : "Ajoute NEXT_PUBLIC_DONATION_URL pour activer un vrai bouton de don PayPal, Ko-fi ou Stripe."
};
