"use client";
import { MagnifyingGlassIcon } from "@heroicons/react/24/solid";
import { Box, Grid, TextFieldInput, TextFieldRoot, TextFieldSlot } from "@radix-ui/themes";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { availableCreds } from "@/available-cred";

export default function Home() {
  const router = useRouter();
  const [search, setSearch] = useState("");

  return (
    <div>
      <h1 className="mt-10 text-center text-3xl">Get Credentials</h1>
      <div className="mt-10">
        <TextFieldRoot>
          <TextFieldSlot>
            <MagnifyingGlassIcon height="16" width="16" />
          </TextFieldSlot>
          <TextFieldInput
            placeholder="Search the credentials..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </TextFieldRoot>
      </div>

      <Grid columns="3" gap="3" width="auto" className="mt-5">
        {Object.keys(availableCreds)
          .filter((credId) => {
            if (search === "") return true;
            return availableCreds[credId].name.toLowerCase().includes(search.toLowerCase());
          })
          .map((credId) => (
            <Box
              height="9"
              key={credId}
              onClick={() => { router.push(`/credentials/${credId}`, { scroll: false })}}
              className="cursor-pointer"
            >
              <div className="rounded-lg border-2 border-black p-5">
                {availableCreds[credId].name} Credential
              </div>
            </Box>
          ))}
      </Grid>
    </div>
  );
}
