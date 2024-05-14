"use client";

import { HomeIcon } from "@heroicons/react/24/solid";
import { AccessControlConditions, AuthSig, ExecuteJsResponse } from "@lit-protocol/types";
import { Card, Text } from "@radix-ui/themes";
import axios from "axios";
import { ethers } from "ethers";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  useAccount,
  useContractRead,
  useWalletClient,
  usePrepareContractWrite,
  useContractWrite,
} from "wagmi";

import { talentlayerIdABI } from "@/abis/talentlayer-id";
import { availableCreds } from "@/available-cred";
import { CreateTalentLayerId } from "@/components/create-talent-layer-id";
import StepsTabs from "@/components/steps-tabs";
import { env } from "@/env.mjs";
import { postToIPFS } from "@/utils/ipfs";
import { lit } from "@/utils/lit-utils/lit";
import { signAndSaveAuthMessage } from "@/utils/lit-utils/signature";
import { generateUUIDwithTimestamp } from "@/utils/uuid";
import { FIXED_PKP } from "@/constants/config";

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
  const { credId } = useParams<{ credId: string }>();
  const { data: client } = useWalletClient();

  useEffect(() => {
    if (!Object.hasOwn(availableCreds, credId)) {
      return;
    }
    const params = new URLSearchParams();
    params.set("client_id", availableCreds[credId].clientId);
    params.set("scope", availableCreds[credId].scope);
    params.set("redirect_url", window.location.origin + window.location.pathname);
    setConnectionUrl(`${availableCreds[credId].authenticationUrl}?${params.toString()}`);
  }, [credId]);

  useEffect(() => {
    console.log("credId = ", credId);
    if (!address || !client) {
      // TODO: set error message
      console.log("you have to connect your wallet");
    }
    if (!code || !address || !client) return;

    (async () => {
      setLoading(true);

      try {
        // Get github access key
        const { data } = await axios.post(`/api/credentials/${credId}`, { code, address });
        const access_token = data.data.access_token;

        // get user signature
        let authSig = await signAndSaveAuthMessage({
          web3: client,
          expiration: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
        });

        // get credentials from serverless lit action
        const {signatures, response } = await initLitAction(access_token, client.account.address, authSig) as ExecuteJsResponse;
        const responseObject = response as any; // used to fix type error

        const credential: Credential = {
          id: responseObject.id,
          credential: responseObject.credential,
          signature1: signatures.sig1,
          issuer: 'Lit Protocol',
        } as Credential;

        setCredential(credential);

        setStepId(2);
      } catch (e) {
        console.log(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [code, address, credId, client]);

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

  // This access control condition check if the user balance of the following contract (TalentLayerId) is >= 1
  // Generated with : https://lit-share-modal-v3-playground.netlify.app/
  const accessControlConditions: AccessControlConditions = [
    {
      conditionType: "evmBasic",
      contractAddress: env.NEXT_PUBLIC_DID_ADDRESS,
      standardContractType: "ERC20",
      chain: env.NEXT_PUBLIC_CHAIN == "testnet" ? "amoy" : "polygon",
      method: "balanceOf",
      parameters: [":userAddress"],
      returnValueTest: {
        comparator: ">=",
        value: "1",
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

  async function initLitAction(githubAccessToken: string, userAddress: string, authSig: AuthSig) {
    if (!client) return;
    // Use the admin pkp if defined or ask the user to mint a new one
    const pkp = FIXED_PKP ? FIXED_PKP : (await lit.mintPkp(client)).publicKey;
    const sigName = "sig1";
    const signatures = await lit.litNodeClient.executeJs({
      ipfsId: "QmazLt86rcD6dqPpfRL3HL2kW1qVnaETvsLrP8wgkBkEfF",
      authSig,
      jsParams: {
        toSign: ethers.utils.arrayify(ethers.utils.keccak256(ethers.utils.toUtf8Bytes("Hello world"))),
        publicKey: pkp,
        sigName,
        githubAccessToken,
        userAddress,
      },
    });

    return signatures;
  }

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
    // Ensure id uniqueness
    const newCredential = {...credential};
    newCredential.id = generateUUIDwithTimestamp();
    newCredential.credential.id = generateUUIDwithTimestamp();
    delete newCredential.credential.claims;

    newCredential.credential.claimsEncrypted = {
      id: generateUUIDwithTimestamp(),
      ...data,
      total: credential.credential.claims?.length || 0,
      condition: JSON.stringify(accessControlConditions), // saved as json for easy storage in ipfs - no need to define a new type
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

    // Ensure id uniqueness
    const newCredential = {...credential};
    newCredential.id = generateUUIDwithTimestamp();
    newCredential.credential.id = generateUUIDwithTimestamp();
    delete newCredential.credential.claimsEncrypted;

    // Stringify complex values
    newCredential.credential.claims?.map((claim) => {
      claim.id = generateUUIDwithTimestamp();
      if (typeof claim.value !== "string") {
        claim.value = JSON.stringify(claim.value);
      }
    });
    profileData.credentials.push(newCredential);
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

  if (!Object.hasOwn(availableCreds, credId)) {
    return <div>Credential Not Found</div>;
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
                {availableCreds[credId].name} Credential
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
          <StepsTabs stepId={stepId} />
          <div className="mt-5"></div>
          {loading && <div>Loading...</div>}
          {stepId === 1 ? (
            <div>
              <a
                href={connectionUrl}
                type="button"
                className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
              >
                Connect with {availableCreds[credId].name}
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
                <button onClick={encrypt} className="btn btn-secondary ml-4 mt-4">
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
