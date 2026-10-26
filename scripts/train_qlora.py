"""
Ruzivo AI — Qwen2.5-1.5B QLoRA Fine-Tuning Script
=================================================
Parameter-Efficient Fine-Tuning (QLoRA 4-bit NF4) of Qwen/Qwen2.5-1.5B
on the ChiShona Instruction & Curriculum Dataset using TRL SFTTrainer.

Usage:
    python scripts/train_qlora.py
"""

import sys
from pathlib import Path
import torch
from datasets import load_dataset
from transformers import (
    AutoModelForCausalLM,
    AutoTokenizer,
    BitsAndBytesConfig,
    TrainingArguments,
)
from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training
from trl import SFTTrainer

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

PROJECT_ROOT = Path(__file__).resolve().parent.parent
BASE_MODEL = "Qwen/Qwen2.5-1.5B"
DATASET_FILE = str(PROJECT_ROOT / "data" / "training" / "shona_instructions_v7_complete.jsonl")
OUTPUT_DIR = str(PROJECT_ROOT / "models" / "ruzivo-llm-v6")

def train_qlora():
    print("=" * 60)
    print("  RUZIVO AI — QLoRA 4-BIT FINE-TUNING PIPELINE")
    print("=" * 60)

    # 1. Load Tokenizer
    print(f"Loading tokenizer for {BASE_MODEL}...")
    tokenizer = AutoTokenizer.from_pretrained(BASE_MODEL, trust_remote_code=True)
    tokenizer.pad_token = tokenizer.eos_token
    tokenizer.padding_side = "right"

    # 2. Configure 4-bit NormalFloat (NF4) Quantization
    bnb_config = BitsAndBytesConfig(
        load_in_4bit=True,
        bnb_4bit_quant_type="nf4",
        bnb_4bit_compute_dtype=torch.float16,
        bnb_4bit_use_double_quant=True,
    )

    print(f"Loading base model {BASE_MODEL} in 4-bit NF4...")
    model = AutoModelForCausalLM.from_pretrained(
        BASE_MODEL,
        quantization_config=bnb_config,
        device_map="auto",
        trust_remote_code=True,
    )
    model = prepare_model_for_kbit_training(model)

    # 3. Configure LoRA Adapter across all 7 linear attention & MLP projections
    peft_config = LoraConfig(
        r=16,
        lora_alpha=32,
        lora_dropout=0.05,
        bias="none",
        task_type="CAUSAL_LM",
        target_modules=[
            "q_proj",
            "k_proj",
            "v_proj",
            "o_proj",
            "gate_proj",
            "up_proj",
            "down_proj",
        ],
    )
    model = get_peft_model(model, peft_config)
    model.print_trainable_parameters()

    # 4. Load Instruction Dataset
    print(f"Loading training dataset from {DATASET_FILE}...")
    dataset = load_dataset("json", data_files=DATASET_FILE, split="train")
    print(f"Loaded {len(dataset):,} instruction samples.")

    # 5. Configure Training Arguments (with cosine scheduler & gradient clipping)
    training_args = TrainingArguments(
        output_dir=OUTPUT_DIR,
        num_train_epochs=3,
        per_device_train_batch_size=4,
        gradient_accumulation_steps=4,
        learning_rate=2e-4,
        max_grad_norm=0.3,
        lr_scheduler_type="cosine",
        warmup_ratio=0.05,
        logging_steps=20,
        save_strategy="epoch",
        fp16=True,
        optim="paged_adamw_8bit",
        report_to="none",
    )

    # 6. Initialize SFTTrainer and Execute Fine-Tuning
    trainer = SFTTrainer(
        model=model,
        train_dataset=dataset,
        peft_config=peft_config,
        args=training_args,
    )

    print("Starting QLoRA fine-tuning...")
    trainer.train()

    # 7. Save Final LoRA Adapter & Tokenizer
    trainer.save_model(OUTPUT_DIR)
    tokenizer.save_pretrained(OUTPUT_DIR)
    print(f"Successfully saved fine-tuned QLoRA adapter to: {OUTPUT_DIR}")
    print("=" * 60)

if __name__ == "__main__":
    train_qlora()
