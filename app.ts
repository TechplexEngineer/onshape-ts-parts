import 'dotenv/config';
import OnshapeApi, { WVM } from './lib/onshape.js';

export const Onshape = new OnshapeApi({
    accessKey: process.env.ONSHAPE_ACCESS_KEY || "",
    secretKey: process.env.ONSHAPE_SECRET_KEY || "",
    debug: true
});
(async () => {
    // console.log(await Onshape.get({} as any));

    let did = "f2dd281fff1cee4d67627c2e"; //toolbox drawer
    let wid = "606e94ad4692296338edd039"; // main version
    let eid_ps = "c2494edebdb1eabcaa6a5370";
    let eid_asm = "e1b650854533c47944c9cb13";
    // console.log(JSON.stringify(await Onshape.GetParts(did, WVM.W, wid, eid), null, "\t"));

    // console.log(JSON.stringify(await Onshape.GetDocument(did), null, "\t"));


    //expected: /api/documents/d/f2dd281fff1cee4d67627c2e/w/606e94ad4692296338edd039/elements?elementType=Assembly

    console.log(JSON.stringify(await Onshape.GetElementsInDocument(
        did, WVM.W, wid, { elementType: "Assembly" }), null, "\t"));

    // /api/assemblies/d/f2dd281fff1cee4d67627c2e/w/606e94ad4692296338edd039/e/c2494edebdb1eabcaa6a5370/bom
    // /api/assemblies/d/f2dd281fff1cee4d67627c2e/w/606e94ad4692296338edd039/e/b56543ae250f192a82e17dfb/bom
    // console.log(JSON.stringify(await Onshape.GetBillOfMaterials(
    //     did,
    //     WVM.W,
    //     wid,
    //     eid_asm
    // ), null, "\t"));


})();



