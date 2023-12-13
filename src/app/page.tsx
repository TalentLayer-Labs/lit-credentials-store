"use client";
import { MagnifyingGlassIcon } from "@heroicons/react/24/solid";
import { Box, Grid, TextFieldInput, TextFieldRoot, TextFieldSlot } from "@radix-ui/themes";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  return (
    <div>
      <div className="text-center text-3xl mt-10">Get Credentials</div>
      <div className="mt-10">
        <TextFieldRoot>
          <TextFieldSlot>
            <MagnifyingGlassIcon height="16" width="16" />
          </TextFieldSlot>
          <TextFieldInput placeholder="Search the credentials..." />
        </TextFieldRoot>
      </div>

      <Grid columns="3" gap="3" width="auto" className="mt-5">
        <Box height="9">
          <div
            onClick={() => router.push(`/credentials/github`, { scroll: false })}
            className="rounded-lg p-5 border-2 border-black"
          >
            Github Credential
          </div>
        </Box>
      </Grid>
    </div>
  );
}
