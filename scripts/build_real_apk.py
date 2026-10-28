import os
import subprocess
import sys

ANDROID_SDK = r"C:\Users\recal\AppData\Local\Android\Sdk"
BUILD_TOOLS = os.path.join(ANDROID_SDK, r"build-tools\36.0.0")
PLATFORM_JAR = os.path.join(ANDROID_SDK, r"platforms\android-37.0\android.jar")
JAVA_HOME = r"C:\Program Files\Java\jdk-26.0.2"
JAVAC = os.path.join(JAVA_HOME, r"bin\javac.exe")
KEYTOOL = os.path.join(JAVA_HOME, r"bin\keytool.exe")

AAPT2 = os.path.join(BUILD_TOOLS, "aapt2.exe")
D8_BAT = os.path.join(BUILD_TOOLS, "d8.bat")
ZIPALIGN = os.path.join(BUILD_TOOLS, "zipalign.exe")
APKSIGNER_BAT = os.path.join(BUILD_TOOLS, "apksigner.bat")

BUILD_DIR = os.path.abspath('scripts/apk_build')
SRC_DIR = os.path.join(BUILD_DIR, 'src', 'com', 'ruzivo', 'app')
RES_DIR = os.path.join(BUILD_DIR, 'res')
BIN_DIR = os.path.join(BUILD_DIR, 'bin')
GEN_DIR = os.path.join(BUILD_DIR, 'gen')
COMPILED_RES = os.path.join(BUILD_DIR, 'compiled_res')

os.makedirs(GEN_DIR, exist_ok=True)
os.makedirs(COMPILED_RES, exist_ok=True)
os.makedirs(BIN_DIR, exist_ok=True)

manifest = os.path.join(BUILD_DIR, 'AndroidManifest.xml')

# Step 1: aapt2 compile resources
print("1. Compiling resources with aapt2...")
res_zip = os.path.join(COMPILED_RES, "res.zip")
cmd = [AAPT2, "compile", "--dir", RES_DIR, "-o", res_zip]
subprocess.run(cmd, check=True)

# Step 2: aapt2 link to produce unaligned APK and R.java
print("2. Linking with aapt2...")
unaligned_apk = os.path.join(BIN_DIR, "unaligned.apk")
cmd = [
    AAPT2, "link",
    "-I", PLATFORM_JAR,
    "--manifest", manifest,
    "-o", unaligned_apk,
    "--java", GEN_DIR,
    "--auto-add-overlay",
    res_zip
]
subprocess.run(cmd, check=True)

# Step 3: Compile Java sources with javac
print("3. Compiling Java sources with javac...")
classes_dir = os.path.join(BIN_DIR, "classes")
os.makedirs(classes_dir, exist_ok=True)

java_files = []
for root, _, files in os.walk(BUILD_DIR):
    for f in files:
        if f.endswith(".java"):
            java_files.append(os.path.join(root, f))

cmd = [
    JAVAC,
    "--release", "8",
    "-cp", PLATFORM_JAR,
    "-d", classes_dir
] + java_files
subprocess.run(cmd, check=True)

# Step 4: Dex classes with D8
print("4. Dexing classes with D8...")
class_files = []
for root, _, files in os.walk(classes_dir):
    for f in files:
        if f.endswith(".class"):
            class_files.append(os.path.join(root, f))

cmd = [
    D8_BAT,
    "--min-api", "24",
    "--lib", PLATFORM_JAR,
    "--output", BIN_DIR
] + class_files

env = os.environ.copy()
env["JAVA_HOME"] = JAVA_HOME
subprocess.run(cmd, check=True, env=env, shell=True)

# Step 5: Add classes.dex into unaligned APK
print("5. Adding classes.dex to APK...")
classes_dex = os.path.join(BIN_DIR, "classes.dex")
import zipfile
# Read unaligned_apk, rewrite with classes.dex included
with zipfile.ZipFile(unaligned_apk, 'a') as z:
    z.write(classes_dex, arcname="classes.dex")

# Step 6: Zipalign APK (4 bytes)
print("6. Aligning APK with zipalign...")
aligned_apk = os.path.join(BIN_DIR, "aligned.apk")
if os.path.exists(aligned_apk):
    os.remove(aligned_apk)

cmd = [ZIPALIGN, "-f", "-p", "4", unaligned_apk, aligned_apk]
subprocess.run(cmd, check=True)

# Step 7: Create keystore if not exists and sign
print("7. Signing APK...")
keystore_path = os.path.join(BUILD_DIR, "ruzivo.keystore")
if not os.path.exists(keystore_path):
    cmd = [
        KEYTOOL, "-genkeypair", "-v",
        "-keystore", keystore_path,
        "-alias", "ruzivo",
        "-keyalg", "RSA",
        "-keysize", "2048",
        "-validity", "10000",
        "-storepass", "ruzivopass",
        "-keypass", "ruzivopass",
        "-dname", "CN=Ruzivo AI, OU=Mobile, O=Ruzivo, L=Harare, ST=Harare, C=ZW"
    ]
    subprocess.run(cmd, check=True)

final_apk = os.path.join(BUILD_DIR, "ruzivo.apk")
if os.path.exists(final_apk):
    os.remove(final_apk)

import shutil
shutil.copyfile(aligned_apk, final_apk)

cmd = [
    APKSIGNER_BAT, "sign",
    "--ks", keystore_path,
    "--ks-key-alias", "ruzivo",
    "--ks-pass", "pass:ruzivopass",
    "--key-pass", "pass:ruzivopass",
    "--v1-signing-enabled", "true",
    "--v2-signing-enabled", "true",
    "--v3-signing-enabled", "true",
    final_apk
]
subprocess.run(cmd, check=True, env=env, shell=True)

# Step 8: Verify signature
print("8. Verifying APK signature...")
cmd = [APKSIGNER_BAT, "verify", "--verbose", final_apk]
subprocess.run(cmd, check=True, env=env, shell=True)

# Copy final_apk to target locations
for dest in ['assets/ruzivo.apk', 'frontend/assets/ruzivo.apk']:
    shutil.copyfile(final_apk, dest)
    print(f"Copied valid signed APK to {dest} ({os.path.getsize(dest)} bytes)")

print("BUILD COMPLETED SUCCESSFULLY!")
