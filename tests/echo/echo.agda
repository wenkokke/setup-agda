{-# OPTIONS --allow-exec #-}

module echo where

open import Agda.Builtin.Equality
open import Agda.Builtin.List
open import Agda.Builtin.Nat
open import Agda.Builtin.Unit
open import Agda.Builtin.Sigma
open import Agda.Builtin.String
open import Agda.Builtin.Reflection renaming (bindTC to _>>=_)

postulate
  execTC : String → List String → String → TC (Σ Nat (λ _ → Σ String (λ _ → String)))

{-# BUILTIN AGDATCMEXEC execTC #-}

macro
  test : Term → TC ⊤
  test hole = execTC "echo" ("hello" ∷ "world" ∷ []) ""
          >>= λ{(exitCode , (stdOut , stdErr)) → unify hole (lit (string stdOut))}


_ : test ≡ "hello world\n"
_ = refl
