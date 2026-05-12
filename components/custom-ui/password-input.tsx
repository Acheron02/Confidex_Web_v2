"use client";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Eye, EyeClosed } from "lucide-react";

interface PasswordInputProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  id?: string;
  name?: string;
}

export function PasswordInput({
  value,
  onChange,
  placeholder = "Enter password",
  id,
  name,
}: PasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="relative w-full">
      <Input
        type={showPassword ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        id={id}
        name={name}
        className="pr-10"
      />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setShowPassword(!showPassword)}
        className="absolute right-0 top-0 h-full hover:cursor-pointer"
      >
        {showPassword ? <Eye /> : <EyeClosed />}
      </Button>
    </div>
  );
}
