"use client";

import { HomeIcon } from "@heroicons/react/24/solid";
import { AccessControlConditions } from "@lit-protocol/types";
import { Card, Text } from "@radix-ui/themes";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { avalancheFuji } from "viem/chains";
import {
  useAccount,
  useWalletClient,
  useSwitchNetwork,
  useNetwork,
} from "wagmi";

import { useUserContext } from "@/app/context/user-context";
import { availableCreds } from "@/available-cred";
import { CreateTalentLayerId } from "@/components/create-talent-layer-id";
import { StepsTabs } from "@/components/steps-tabs";
import { WalletStatus } from "@/components/wallet/wallet-status";
import { litChronicle } from "@/constants/chains";
import { env } from "@/env.mjs";
import { CredentialService } from "@/services/credential-service";
import { GitHubService } from "@/services/github-service";
import { pinToTheGraph, postToIPFSwithPinata } from "@/utils/ipfs";
import { lit } from "@/utils/lit-utils/lit";
import { generateUUIDwithTimestamp } from "@/utils/uuid";

import {ICredential} from "../../../interfaces/Credential"

export default function CredentialPage() {
  const [stepId, setStepId] = useState(1);
  const [connectionUrl, setConnectionUrl] = useState<string>();
  const searchParams = useSearchParams();
  const code = searchParams.get("code");
  const { address } = useAccount();
  const [credential, setCredential] = useState<ICredential>();
  const { credId } = useParams<{ credId: string }>();
  const { data: client } = useWalletClient();
  const { switchNetwork } = useSwitchNetwork();
  const { chain } = useNetwork();
  const { profile, initialProfile, newCid, setNewCid, WriteProfile, udaptedUserTxHash } = useUserContext() as { profile: any, initialProfile: any, newCid: any, setNewCid: any, WriteProfile: any, udaptedUserTxHash: any };
  const [updatedProfile, setUpdatedProfile] = useState<any>();

  let service: CredentialService | null = null;

  // Init the service (github, gitlab...)
  if (credId && availableCreds[credId]) {
    const { clientId, scope, authenticationUrl } = availableCreds[credId];
    switch (credId) {
      case 'github':
        service = new GitHubService(clientId, scope, authenticationUrl, credId);
        break;
    }
  }

  const Step1Block = () => {
    const [loading, setLoading] = useState(false);

    // Prepare the connection url to connect to the service
    useEffect(() => {
      if (!Object.hasOwn(availableCreds, credId)) {
        return;
      }
      const params = new URLSearchParams();
      params.set("client_id", availableCreds[credId].clientId);
      params.set("scope", availableCreds[credId].scope);
      params.set("redirect_url", window.location.origin + window.location.pathname);
      setConnectionUrl(`${availableCreds[credId].authenticationUrl}?${params.toString()}`);
    }, []);

    useEffect(() => {
      if (!address || !client || !code || !service) {
        return;
      }
      (async () => {
        setLoading(true);
        try {
          if (!profile) return;
          const accessToken = profile.accessToken ? profile.accessToken : await service.fetchAccessToken(code, address);
          profile.accessToken = accessToken;
          setUpdatedProfile(profile);
        } catch (e) {
          console.log(e);
        } finally {
          setLoading(false);
        }
      })();
    }, []);

    const canGoStep2 = profile && profile?.accessToken && profile.accessToken.length > 0;

    return (
      <div>
        <h3 className="mb-4 text-xl font-bold">Step 1</h3>
        {loading && <div>Loading...</div>}
        {!loading && !profile?.accessToken && (
          (!address || !client) ? (
            <WalletStatus />
          ):(
            <a
              href={connectionUrl}
              type="button"
              className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            >
              Connect with {availableCreds[credId].name}
            </a>
          )
        )}
        {profile?.accessToken && <p>✅ Access Token : {profile.accessToken.slice(0, 10)}...</p>}
        {canGoStep2 &&
          <div className="mt-4">
            <a
              href="#"
              type="button"
              className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
              onClick={() => setStepId(2)}
            >
              Go To Step 2
            </a>
          </div>
        }
      </div>
    )
  }

  const Step2Block = () => {
    const isOnLitNetwork = chain?.id === litChronicle.id;
    const [loading, setLoading] = useState(false);

    if (!service || !code || !address) {
      return <div>Service not found</div>;
    }
    const switchToLitNetwork = () => {
      if (!isOnLitNetwork && switchNetwork) {
        switchNetwork(litChronicle.id);
      }
    }
    const step2 = async () => {
      if (!updatedProfile || !updatedProfile?.accessToken) {
        return <div>Profile not found: <a href="#" className="underline" onClick={() => setStepId(1)}>Go To Step 1</a></div>;
      }
      setLoading(true);
      try {
        const fetchedCredential = await service.fetchCredential(updatedProfile.accessToken, address, client);
        updatedProfile.credentials = [fetchedCredential];
        await setCredential(fetchedCredential);
      } catch (e) {
        console.log(e);
      } finally {
        setLoading(false);
      }
    }

    return <div>
      <h3 className="mb-4 text-xl font-bold">Step 2</h3>
      {isOnLitNetwork && 
        <div>
          <p>✅ You are on the Lit network</p>
          {credential && <div>
            <p>✅ User signature</p>
            <p>✅ PKP minted</p>
            <p>✅ Lit Action executed</p>
            <p>✅ Data available</p>
            <div className="mt-4">
              <a
                href="#"
                className="mt-4 rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                onClick={() => setStepId(3)}>Go To Step 3</a>
            </div>
          </div>}
          {!credential && !loading &&
          <div className="mt-4">
            <a
              href="#"
            className="mt-4 rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            onClick={step2}>
              Sign and mint pkp to fetch with litAction
            </a>
            <p className="mt-2 text-sm text-gray-500">(one signature to prepare mint & one to execute litAction)</p>
          </div>}
          {loading && <div>Loading...</div>}
        </div>
      }
      {!isOnLitNetwork && 
        <div>You need to be on the Lit network : 
          <a
            href="#"
            className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            onClick={switchToLitNetwork}>
              Switch to the Lit network
          </a>
        </div>
      }
    </div>;
  }

  const Step3Block = () => {
    const isOnFujiNetwork = chain?.id === avalancheFuji.id;
    const switchToFujiNetwork = () => {
      if (!isOnFujiNetwork && switchNetwork) {
        switchNetwork(avalancheFuji.id);
      }
    }
    if (!credential || !credential.credential) {
      return <div>Credential not found, <a href="#" className="underline" onClick={() => setStepId(2)}>Go To Step 2</a></div>;
    }

    async function encrypt() {
      if (!client || !credential || !credential.credential || !profile) return;
  
      await lit.connect();
  
      const data = await lit.encrypt(
        client,
        accessControlConditions,
        JSON.stringify(credential.credential.claims),
      );
  
      // init profileData
      const profileData = { ...initialProfile };
      if (!profileData.credentials?.length) {
        profileData.credentials = [];
      }
      // remove existing credentials with the same author and platform
      profileData.credentials = profileData.credentials.filter(
        (c: any) =>
          c.credential.author !== credential.credential?.author ||
          c.credential.platform !== credential.credential?.platform,
      );
      // Add the new credential while ensuring id uniqueness (or create error in thegraph)
      const newCredential = {
        ...credential,
        id: generateUUIDwithTimestamp(),
        credential: { ...credential.credential, id: generateUUIDwithTimestamp() },
      };
      delete newCredential.credential.claims;
  
      newCredential.credential.claimsEncrypted = {
        id: generateUUIDwithTimestamp(),
        ...data,
        total: credential.credential.claims?.length || 0,
        condition: JSON.stringify(accessControlConditions), // saved as json for easy storage in ipfs - no need to define a new type
      };
      profileData.credentials.push(newCredential);
      const cid = await postToIPFSwithPinata(JSON.stringify(profileData));
      // pin to the graph to request indexation 
      await pinToTheGraph(JSON.stringify(profileData));
      await setNewCid(cid);
    }
  
    async function save() {
      if (!credential || !credential.credential || !profile) return;
  
      // init profileData
      const profileData = { ...initialProfile };
      if (!profileData.credentials?.length) {
        profileData.credentials = [];
      }
      profileData.credentials = profileData.credentials.filter(
        (c: any) =>
          c.credential.author !== credential.credential?.author ||
          c.credential.platform !== credential.credential?.platform,
      );
  
      // Ensure id uniqueness
      const newCredential = {
        ...credential,
        id: generateUUIDwithTimestamp(),
        credential: { ...credential.credential, id: generateUUIDwithTimestamp() },
      };
      delete newCredential.credential.claimsEncrypted;
  
      // Stringify complex values
      newCredential.credential.claims?.map((claim) => {
        claim.id = generateUUIDwithTimestamp();
        if (typeof claim.value !== "string") {
          claim.value = JSON.stringify(claim.value);
        }
      });
      profileData.credentials.push(newCredential);
      const cid = await pinToTheGraph(JSON.stringify(profileData));
      await setNewCid(cid);
    }

    return <div>
      <h3 className="mb-4 text-xl font-bold">Step 3</h3>
      <div className="my-4 text-xl font-bold">Claims : </div>
      <div className="grid grid-cols-3 gap-3">
        {credential.credential.claims?.map((claim) => (
          <Card key={claim.criteria} variant="surface">
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
      <div className="text-center">
        {isOnFujiNetwork &&
        <div>
          <button onClick={save} className="btn btn-primary mt-4">
            Save
          </button>
          <button onClick={encrypt} className="btn btn-secondary ml-4 mt-4">
            Encrypt & Save
          </button>
        </div>
        }
        {!isOnFujiNetwork &&
        <div className="mt-4">You need to be on the Fuji network to save the credentials: 
          <a
            href="#"
            className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            onClick={switchToFujiNetwork}>
              Switch to the Fuji network
          </a>
        </div>
        }
      </div>
    </div>
  }

  // This access control condition check if the user balance of the following contract (TalentLayerId) is >= 1
  // Generated with : https://lit-share-modal-v3-playground.netlify.app/
  const accessControlConditions: AccessControlConditions = [
    {
      conditionType: "evmBasic",
      contractAddress: env.NEXT_PUBLIC_TALENTLAYER_DID_ADDRESS,
      standardContractType: "ERC20",
      chain: "fuji",
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

  if (!Object.hasOwn(availableCreds, credId)) {
    return <div>Credential Not Found</div>;
  }

  if ((!profile || !(profile as any[])[3]) && stepId !== 2 && stepId !== 3) {
    return (
      <div>
        <div className="">TalentLayer ID not found</div>
        <div className="flex">
          {!profile && switchNetwork && <p className="mr-2">Connect your wallet on the <a href="#" onClick={() => switchNetwork(avalancheFuji.id)} target="_blank" className="text-blue-500">{avalancheFuji.name}</a> network or:</p>}
          <CreateTalentLayerId />
        </div>
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
                <HomeIcon className="size-5 shrink-0" aria-hidden="true" />
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
      <div>
        <StepsTabs stepId={stepId} />
        <div className="mt-5"></div>
        {stepId === 1 ? (
          <Step1Block />
        ) : stepId === 2 ? (
          <Step2Block />
        ) : (
          <Step3Block />
        )}
      </div>
      {newCid && <WriteProfile newCid={newCid} />}
      {udaptedUserTxHash && (
        <div>
          ✅ The credential has been added to your <a href={`https://starterkit-lit.vercel.app/dashboard/profile/edit/trust-score`} target="_blank" className="text-blue-500">profile</a>.<br/>
          (you may need to refresh the page after 10-15sec to see the credential)<br/>
          Click{" "}
          <a
            href={`${process.env.NEXT_PUBLIC_BLOCKEXPLORER_LINK}/tx/${udaptedUserTxHash}`}
            target="_blank"
            className="text-blue-500 hover:underline"
          >
            here
          </a>{" "}
          to open block explorer. <br/>
        </div>
      )}
    </div>
  );
}