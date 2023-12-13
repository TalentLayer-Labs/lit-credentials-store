"use client";

import { HomeIcon } from "@heroicons/react/24/solid";
import { EvmContractConditions, AccessControlConditions } from "@lit-protocol/types";
import { Card, Text } from "@radix-ui/themes";
import axios from "axios";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  useAccount,
  useContractRead,
  useWalletClient,
  usePrepareContractWrite,
  useContractWrite,
} from "wagmi";

import { talentlayerIdABI } from "@/abis/talentlayer-id";
import { CreateTalentLayerId } from "@/components/create-talent-layer-id";
import { env } from "@/env.mjs";
import { postToIPFS } from "@/utils/ipfs";

import lit from "./lit";
import Steps from "./steps";

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

export default function CredentialPage() {
  const [stepId, setStepId] = useState(1);
  const [connectionUrl, setConnectionUrl] = useState<string>();
  const searchParams = useSearchParams();
  const code = searchParams.get("code");
  const [loading, setLoading] = useState(false);
  const { address } = useAccount();
  const [credential, setCredential] = useState<Credential>();
  const [initialProfile, setInitialProfile] = useState<any>({});
  const [transactionHash, setTransactionHash] = useState<string>();

  useEffect(() => {
    const params = new URLSearchParams();
    params.set("client_id", env.NEXT_PUBLIC_GITHUB_OAUTH_CLIENT_ID);
    params.set("scope", "read:user");
    params.set("redirect_url", "http://localhost:3000/credentials/github");

    console.log(`https://github.com/login/oauth/authorize?${params.toString()}`);

    setConnectionUrl(`https://github.com/login/oauth/authorize?${params.toString()}`);
  }, []);

  useEffect(() => {
    if (!code || !address) return;

    (async () => {
      setLoading(true);

      try {
        const {
          data: { credential: _credential },
        } = await axios.post(`/api/credentials/github`, { code, address });
        setCredential(_credential);

        setStepId(2);
      } catch (e) {
        console.log(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [code, address]);

  const { data: client } = useWalletClient();

  const { data: id } = useContractRead(
    address
      ? {
          abi: talentlayerIdABI,
          address: env.NEXT_PUBLIC_DID_ADDRESS as `0x${string}`,
          account: address,
          args: [address],
          functionName: "ids",
        }
      : undefined,
  );

  const { data: profile } = useContractRead(
    id
      ? {
          abi: talentlayerIdABI,
          address: env.NEXT_PUBLIC_DID_ADDRESS as `0x${string}`,
          account: address,
          args: [id],
          functionName: "profiles",
        }
      : undefined,
  );

  useEffect(() => {
    if (!profile || !(profile as any[])[3]) {
      setInitialProfile({});
      return;
    }

    const oldProfileCID = (profile as any)[3] as string;
    (async () => {
      const { data } = await axios.get(
        `${process.env.NEXT_PUBLIC_IPFS_GATEWAY_URL}/ipfs/${oldProfileCID}`,
      );
      setInitialProfile(data);
    })();
  }, [profile]);

  console.log(initialProfile);

  const accessControlConditions: EvmContractConditions = [
    {
      conditionType: "evmContract",
      contractAddress: env.NEXT_PUBLIC_DID_ADDRESS,
      functionName: "balanceOf",
      functionParams: [":userAddress"],
      functionAbi: {
        type: "function",
        stateMutability: "view",
        outputs: [
          {
            type: "uint256",
            name: "",
            internalType: "uint256",
          },
        ],
        name: "balanceOf",
        inputs: [
          {
            type: "address",
            name: "account",
            internalType: "address",
          },
        ],
      },
      chain: env.NEXT_PUBLIC_CHAIN == "testnet" ? "mumbai" : "polygon",
      returnValueTest: {
        key: "",
        comparator: ">",
        value: "0",
      },
    },
  ];

  useEffect(() => {
    (async () => {
      await lit.connect();
    })();
  }, []);

  const [newCid, setNewCid] = useState<string>();
  const { config } = usePrepareContractWrite(
    newCid && id
      ? {
          abi: talentlayerIdABI,
          address: env.NEXT_PUBLIC_DID_ADDRESS as `0x${string}`,
          account: address,
          args: [id, newCid],
          functionName: "updateProfileData",
        }
      : undefined,
  );

  const { writeAsync } = useContractWrite(config);

  useEffect(() => {
    if (!newCid || !writeAsync) return;

    (async () => {
      const { hash } = await writeAsync();
      setTransactionHash(hash);
    })().catch((err) => console.error(err));
  }, [newCid, writeAsync]);

  async function encrypt() {
    if (!client || !credential) return;

    const data = await lit.encrypt(
      client,
      accessControlConditions,
      JSON.stringify(credential.credential.claims),
    );

    // fetch the file from ipfs
    const profileData = { ...initialProfile };
    if (!profileData.credentials?.length) {
      profileData.credentials = [];
    }
    profileData.credentials = profileData.credentials.filter(
      (c: any) =>
        c.credential.author !== credential.credential.author ||
        c.credential.platform !== credential.credential.platform,
    );
    const newCredential = structuredClone(credential);
    delete newCredential.credential.claims;
    newCredential.credential.claimsEncrypted = {
      ...data,
      total: credential.credential.claims?.length || 0,
      condition: accessControlConditions,
    };
    profileData.credentials.push(newCredential);
    const cid = await postToIPFS(JSON.stringify(profileData));
    setNewCid(cid);
  }

  async function save() {
    if (!credential) return;

    // fetch the file from ipfs
    const profileData = { ...initialProfile };
    if (!profileData.credentials?.length) {
      profileData.credentials = [];
    }
    profileData.credentials = profileData.credentials.filter(
      (c: any) =>
        c.credential.author !== credential.credential.author ||
        c.credential.platform !== credential.credential.platform,
    );
    profileData.credentials.push(credential);
    const cid = await postToIPFS(JSON.stringify(profileData));
    setNewCid(cid);
  }

  if (!profile || !(profile as any[])[3]) {
    return (
      <div>
        <div className="">TalentLayer ID not found</div>
        <CreateTalentLayerId />
      </div>
    );
  }

  return (
    <div>
      <nav className="my-10 flex" aria-label="Breadcrumb">
        <ol role="list" className="flex space-x-4 rounded-md bg-white px-6 shadow">
          <li className="flex">
            <div className="flex items-center">
              <Link href="/" className="text-gray-400 hover:text-gray-500">
                <HomeIcon className="h-5 w-5 shrink-0" aria-hidden="true" />
                <span className="sr-only">Home</span>
              </Link>
            </div>
          </li>
          <li className="flex">
            <div className="flex items-center">
              <svg
                className="h-full w-6 shrink-0 text-gray-200"
                viewBox="0 0 24 44"
                preserveAspectRatio="none"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M.293 0l22 22-22 22h1.414l22-22-22-22H.293z" />
              </svg>
              <span
                className="ml-4 text-sm font-medium text-gray-500 hover:text-gray-700"
                aria-current="page"
              >
                Github Credential
              </span>
            </div>
          </li>
        </ol>
      </nav>

      {transactionHash ? (
        <div>
          The credential is added to your profile. Click{" "}
          <a
            href={`${process.env.NEXT_PUBLIC_BLOCKEXPLORER_LINK}/tx/${transactionHash}`}
            target="_blank"
            className="text-blue-500"
          >
            here
          </a>{" "}
          to open block explorer.
        </div>
      ) : (
        <>
          <Steps stepId={stepId} />
          <div className="mt-5"></div>
          {loading && <div>Loading...</div>}
          {stepId === 1 ? (
            <div>
              <a
                href={connectionUrl}
                type="button"
                className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
              >
                Connect with Github
              </a>
            </div>
          ) : (
            <div>
              <div className="my-4 text-xl font-bold">Claims</div>
              <div className="">
                <div className="grid grid-cols-3 gap-3">
                  {credential?.credential.claims?.map((claim) => (
                    <Card key={claim.criteria} variant="surface" className="">
                      <Text as="div" size="2" weight="bold">
                        {claim.criteria}
                      </Text>
                      <Text as="div" color="gray" size="2">
                        {claim.condition}{" "}
                        {Array.isArray(claim.value) ? `[${claim.value.join(", ")}]` : claim.value}
                      </Text>
                    </Card>
                  ))}
                </div>
              </div>
              <div className="text-center">
                <button onClick={save} className="btn btn-primary mt-4">
                  Save
                </button>
                <button onClick={encrypt} className="ml-4 mt-4 btn btn-secondary">
                  Encrypt & Save
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
