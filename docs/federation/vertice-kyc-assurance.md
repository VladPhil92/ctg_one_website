# VÉRTICE KYC assurance claim

CTG One may include a minimal KYC attestation in its authenticated server-to-server VÉRTICE federation exchange when, and only when, the canonical CTG One KYC record is verified.

The claim contains no cédula number, document image or storage URL. It carries only verification status, assurance level, source, the verified KYC submission identifier and its review timestamp.

If KYC state cannot be established consistently, CTG One omits the claim and federation authentication continues without identity elevation. VÉRTICE must validate the claim strictly before reusing it.
