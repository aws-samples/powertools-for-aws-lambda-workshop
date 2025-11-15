
# AWS Environment Variables
export AWS_DEFAULT_REGION={{AWS_REGION}}
export AWS_REGION={{AWS_REGION}}
export AWS_ACCOUNT_ID={{AWS_ACCOUNT}}
export CDK_DEFAULT_REGION={{AWS_REGION}}
export CDK_DEFAULT_ACCOUNT={{AWS_ACCOUNT}}

# Workshop Makefile wrapper - run make from anywhere in workshop directory
function make() {
  local workshop_root="/home/{{WHOAMI_USER}}/{{WORKSHOP_DIRECTORY}}"
  local current_dir="$PWD"
  case "$current_dir" in
    "$workshop_root"*)
      command make -C "$workshop_root" "$@"
      ;;
    *)
      command make "$@"
      ;;
  esac
}
