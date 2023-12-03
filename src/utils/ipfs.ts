import { create, IPFSHTTPClient } from "ipfs-http-client";

export const postToIPFS = async (data: any): Promise<string> => {
  let ipfs: IPFSHTTPClient | undefined;
  let cid = "";
  try {
    const authorization =
      "Basic " +
      Buffer.from(
        process.env.NEXT_PUBLIC_INFURA_ID + ":" + process.env.NEXT_PUBLIC_INFURA_SECRET,
      ).toString("base64");
    ipfs = create({
      url: process.env.NEXT_PUBLIC_IPFS_WRITE_URL,
      headers: {
        authorization,
      },
    });
    const result = await (ipfs as IPFSHTTPClient).add(data);
    cid = `${result.path}`;
  } catch (error) {
    console.error("IPFS error ", error);
  }
  return cid;
};
