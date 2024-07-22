import axios from "axios";
import React, { createContext, useContext, useEffect, useState } from "react";
import { useAccount, useContractRead, usePrepareContractWrite, useContractWrite } from "wagmi";


import { talentlayerIdABI } from "@/abis/talentlayer-id";
import { env } from "@/env.mjs";

import { Credential } from "../../interfaces/Credential";

interface ProfileType {
  id: string;
  credentials: Credential[];
  // Define the structure of the profile object
}

interface UserContextType {
  id: string | undefined;
  profile: ProfileType | undefined;
  initialProfile: ProfileType | undefined;
  newCid: string | undefined;
  setNewCid: (cid: string) => void;
  transactionHash: string | undefined;
  writeProfile: () => Promise<void>;
  loading: boolean; // Add loading state
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { address } = useAccount();
  const [initialProfile, setInitialProfile] = useState<ProfileType | undefined>(undefined);
  const [newCid, setNewCid] = useState<string | undefined>(undefined);
  const [udaptedUserTxHash, setUdaptedUserTxHash] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState<boolean>(true); // Initialize loading state

  // Fetch the user's TalentLayer ID
  const { data: id } = useContractRead(
    address
      ? {
          abi: talentlayerIdABI,
          address: env.NEXT_PUBLIC_TALENTLAYER_DID_ADDRESS as `0x${string}`,
          account: address,
          args: [address],
          functionName: "ids",
        }
      : undefined,
  );

  // Fetch the user's TalentLayer profile
  const { data: profile } = useContractRead(
    id
      ? {
          abi: talentlayerIdABI,
          address: env.NEXT_PUBLIC_TALENTLAYER_DID_ADDRESS as `0x${string}`,
          account: address,
          args: [id],
          functionName: "profiles",
        }
      : undefined,
  );

  // Fetch the user's TalentLayer profile metadata (on ipfs)
  useEffect(() => {
    if (!profile || !(profile as any[])[3]) {
      setInitialProfile(undefined);
      setLoading(false); // Set loading to false when no profile is found
      return;
    }

    const oldProfileCID = (profile as any)[3] as string;
    const fetchProfileData = async () => {
      setLoading(true); // Set loading to true when starting fetch
      try {
        const { data } = await axios.get<ProfileType>(
          `${process.env.NEXT_PUBLIC_IPFS_GATEWAY_URL}/ipfs/${oldProfileCID}`,
        );
        setInitialProfile(data);
      } catch (error) {
        console.error('Error fetching profile data:', error);
      } finally {
        setLoading(false); // Set loading to false when fetch is complete
      }
    };

    fetchProfileData();
  }, [profile]);

  // Prepare the contract write to update the user's profile
  const { config } = usePrepareContractWrite(
    newCid && id
      ? {
          abi: talentlayerIdABI,
          address: env.NEXT_PUBLIC_TALENTLAYER_DID_ADDRESS as `0x${string}`,
          account: address,
          args: [id, newCid],
          functionName: "updateProfileData",
        }
      : undefined,
  );

  const { writeAsync } = useContractWrite(config);

  const writeProfile = async (): Promise<void> => {
    if (!newCid || !writeAsync) return;
    try {
      const { hash } = await writeAsync();
      setUdaptedUserTxHash(hash);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <UserContext.Provider
      value={{ profile, initialProfile, newCid, setNewCid, udaptedUserTxHash, writeProfile, loading }} // Include loading in context
    >
      {children}
    </UserContext.Provider>
  );
};

export const useUserContext = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUserContext must be used within a UserProvider");
  }
  return context;
};