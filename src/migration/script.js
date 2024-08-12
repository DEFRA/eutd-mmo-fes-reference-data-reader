//Script to set the system blocks rules
db.getCollection("systemBlocks").updateMany({ name: { $in: ["CC_3d", "CC_3c"] } }, { $set: { status: true } })
db.getCollection("systemBlocks").updateMany({ name: { $in: ["PS_SD_4b", "CC_4a"] } }, { $set: { status: false } })