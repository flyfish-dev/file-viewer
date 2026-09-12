import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";
const output = resolve(process.argv[2] || "output/ifc-samples");
const revision = "80d976a9b193a26a8e928c3e79bff67af1de68a8";
const files = [
  [
    "ifc4.ifc",
    "IFC 4.0.2.1 (IFC 4 ADD2 TC1)/Simple-Scene/Building-Architecture.ifc",
    "8790a1e193e82b8e7e7f337ec2633cd40f2120590317a1443503a25b079e2e80",
  ],
  [
    "ifc43.ifc",
    "IFC 4.3.2.0 (IFC 4.3 ADD2)/Simple-Scene/Building-Architecture.ifc",
    "96e7103812b15b65eb1fd7802d36b9962833485dce5ead4f440bbf529530881d",
  ],
];
await mkdir(output, { recursive: true });
for (const [name, path, hash] of files) {
  const response = await fetch(
    `https://raw.githubusercontent.com/buildingSMART/Certification-datasets/${revision}/${path.split("/").map(encodeURIComponent).join("/")}`,
    { signal: AbortSignal.timeout(60000) },
  );
  if (!response.ok)
    throw new Error(`IFC fixture ${name}: HTTP ${response.status}`);
  const parts = [];
  let total = 0;
  for await (const chunk of response.body) {
    total += chunk.byteLength;
    if (total > 8 * 1024 * 1024) throw new Error("Unexpectedly large fixture");
    parts.push(chunk);
  }
  const bytes = Buffer.concat(parts);
  if (createHash("sha256").update(bytes).digest("hex") !== hash)
    throw new Error(`IFC fixture checksum mismatch: ${name}`);
  await writeFile(join(output, name), bytes);
}
await writeFile(
  join(output, "NOTICE.txt"),
  `Unmodified buildingSMART International Ltd. Certification-datasets fixtures, CC BY 4.0.\nhttps://github.com/buildingSMART/Certification-datasets/tree/${revision}\nLicense: https://creativecommons.org/licenses/by/4.0/\n`,
);
console.log(`Verified original IFC fixtures: ${output}`);
