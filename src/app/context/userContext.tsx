import axios from "axios";
import React, { createContext, useContext, useEffect, useState } from "react";
import { useAccount, useContractRead, usePrepareContractWrite, useContractWrite } from "wagmi";


import { talentlayerIdABI } from "@/abis/talentlayer-id";
import { env } from "@/env.mjs";

import { ICredential } from "../../interfaces/Credential";

interface ProfileType {
  id: string;
  credentials: ICredential[];
  accessToken: string;
}

interface UserContextType {
  id: string | undefined;
  profile: ProfileType | undefined;
  initialProfile: ProfileType | undefined;
  newCid: string | undefined;
  transactionHash: string | undefined;
  loading: boolean;
  udaptedUserTxHash: string | undefined;
  WriteProfile: ({newCid}: {newCid: string}) => Promise<string | undefined>;
  setNewCid: (cid: string) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { address } = useAccount();
  const [initialProfile, setInitialProfile] = useState<ProfileType | undefined>(undefined);
  const [udaptedUserTxHash, setUdaptedUserTxHash] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState<boolean>(true); // Initialize loading state
  const [newCid, setNewCid] = useState<string | undefined>(undefined);

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

  const WriteProfile = ({newCid}: {newCid: string}) => {
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

    useEffect(() => {
      
      if (udaptedUserTxHash) return; // do not execute a 2nd time
      
      const executeWriteProfile = async () => {
        if (newCid && config && writeAsync) {
          try {
            const { hash } = await writeAsync();
            setUdaptedUserTxHash(hash);
            return hash;
          } catch (err) {
            console.error(err);
          }
        }
      };

      executeWriteProfile();
    }, [writeAsync]);
  }

  return (
    <UserContext.Provider
      value={{ profile, initialProfile, newCid, setNewCid, udaptedUserTxHash, WriteProfile, loading }} // Include loading in context
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