if ($env:Path -notlike "*C:\Program Files\nodejs*") {
    $env:Path = "C:\Program Files\nodejs;" + $env:Path
}
npm run dev
