"use client";
import { availableCreds } from "@/availableCred";
import { MagnifyingGlassIcon } from "@heroicons/react/24/solid";
import { Box, Grid, TextFieldInput, TextFieldRoot, TextFieldSlot } from "@radix-ui/themes";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function Home() {
  const router = useRouter();
  const [search, setSearch] = useState("");

  return (
    <div>
      <div className="text-center text-3xl mt-10">Get Credentials</div>
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
            <Box height="9">
              <div
                onClick={() => router.push(`/credentials/${credId}`, { scroll: false })}
                className="rounded-lg p-5 border-2 border-black"
              >
                {availableCreds[credId].name} Credential
              </div>
            </Box>
          ))}
      </Grid>
    </div>
  );
}
