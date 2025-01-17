interface Credential {
  id: string;
  issuer: string;
  signature1: string;
  signature2?: string;
  credential: {
    id: string;
    author: string;
    platform: string;
    description: string;
    issueTime: string;
    expiryTime: string;
    userAddress: string;
    claims?: {
      id: string;
      platform: string;
      criteria: string;
      condition: string;
      value: any;
    }[];
    claimsEncrypted?: {
      id: string;
      total: number;
      ciphertext: string;
      dataToEncryptHash: string;
      condition: EvmContractConditions | AccessControlConditions;
    };
  };
}
