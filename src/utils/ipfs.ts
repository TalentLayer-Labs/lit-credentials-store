import { env } from "@/env.mjs";
import axios from "axios";
import { create, IPFSHTTPClient } from "ipfs-http-client";

export const pinToTheGraph = async (data: any): Promise<string> => {
  let ipfs: IPFSHTTPClient | undefined;
  let cid = "";
  try {
    ipfs = create({
      host: 'api.thegraph.com',
      port: 443,
      protocol: 'https',
      apiPath: '/ipfs/api/v0'
    });
    const result = await (ipfs as IPFSHTTPClient).add(data);
    cid = `${result.path}`;
  } catch (error) {
    console.error("IPFS error ", error);
  }
  return cid;
};

export const postToIPFSwithPinata = async (data: any): Promise<string> => {
  const JWT = env.NEXT_PUBLIC_PINATA_JWT;

  const pinJSONToIPFS = async (jsonData: any) => {
    const formData = new FormData();
    const blob = new Blob([jsonData], { type: 'application/json' });
    formData.append('file', blob, 'data.json');

    const pinataMetadata = JSON.stringify({
      name: 'JSON Data',
    });
    formData.append('pinataMetadata', pinataMetadata);

    const pinataOptions = JSON.stringify({
      cidVersion: 0,
    });
    formData.append('pinataOptions', pinataOptions);

    try {
      const res = await axios.post("https://api.pinata.cloud/pinning/pinFileToIPFS", formData, {
        maxBodyLength: Infinity,
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${JWT}`
        }
      });
      return res.data.IpfsHash;
    } catch (error) {
      console.error(error);
      throw new Error('Error while uploading to IPFS - post failed : ' + error);
    }
  };

  const cid = await pinJSONToIPFS(data);
  return cid;
};