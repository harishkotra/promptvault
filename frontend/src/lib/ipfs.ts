const IPFS_GATEWAY =
  process.env.NEXT_PUBLIC_IPFS_GATEWAY || "https://gateway.pinata.cloud/ipfs/";

export interface IpfsPayload {
  iv: string;
  ciphertext: string;
  encoding: "aes-256-gcm";
}

export async function uploadToIpfs(data: IpfsPayload): Promise<string> {
  const json = JSON.stringify(data);
  const blob = new Blob([json], { type: "application/json" });
  const file = new File([blob], "prompt.json", { type: "application/json" });

  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(
    "https://api.pinata.cloud/pinning/pinFileToIPFS",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_PINATA_JWT}`,
      },
      body: formData,
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`IPFS upload failed: ${err}`);
  }

  const result = await res.json();
  return result.IpfsHash as string;
}

export async function downloadFromIpfs(cid: string): Promise<IpfsPayload> {
  const res = await fetch(`${IPFS_GATEWAY}${cid}`);

  if (!res.ok) {
    throw new Error(`IPFS download failed for ${cid}: ${res.statusText}`);
  }

  return res.json();
}
