interface Credential {
  issuer: string;
  signature1: string;
  signature2: string;
  credential: {
    author: string;
    platform: string;
    description: string;
    issueTime: string;
    expiryTime: string;
    userAddress: string;
    claims?: {
      platform: string;
      criteria: string;
      condition: string;
      value: any;
    }[];
    claimsEncrypted?: {
      total: number;
      ciphertext: string;
      dataToEncryptHash: string;
      condition: EvmContractConditions | AccessControlConditions;
    };
  };
}
