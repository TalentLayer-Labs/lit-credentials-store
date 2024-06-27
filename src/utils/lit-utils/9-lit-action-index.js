

const go = async () => {

  const claims = await createClaims(githubAccessToken)
  const currentTimestamp = (new Date().getTime() / 1000) | 0;
  const expiryTimestamp = currentTimestamp + 30 * 24 * 60 * 60;

  const credentials = {
    id: generateUUIDwithTimestamp(),
    credential: {
      id: generateUUIDwithTimestamp(),
      author: "Talentlayer Core Team",
      platform: "github.com",
      description:
        "This credential validates user's programming skills and his open source contributions",
      issueTime: currentTimestamp.toString(),
      expiryTime: expiryTimestamp.toString(),
      userAddress,
      claims,
    },
  };

  const toSignETH = ethers.utils.arrayify(ethers.utils.keccak256(ethers.utils.toUtf8Bytes("Hello world !")));
  await Lit.Actions.signEcdsa({ toSign: toSignETH, publicKey, sigName });
  LitActions.setResponse({ response: JSON.stringify(credentials) });
};

go();
