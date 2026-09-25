; repository version 194, built on Fri, 25 Sep 2026 16:07:13 -0700 for project "c64fps" using
; make PLATFORM=c64 prg INSTALL=0c00 RESIDENT=0400 ZP=e8 PROJECT=c64fps

; configuration
config_ALLOW_2_MHZ_ON_C128      = 0
config_DECOMPRESSOR             = 0; NONE
config_DIRTRACK                 = 18
config_DIRTRACK81               = 40
config_END_ADDRESS_API          = 0
config_FILENAME_MAXLENGTH       = 16
config_FILE_EXISTS_API          = 0
config_INTERNAL                 = 0
config_LOAD_COMPD_API           = 0
config_LOAD_RAW_API             = 1
config_LOAD_TO_API              = 0
config_LOAD_UNDER_D000_DFFF     = 0
config_LOAD_VIA_KERNAL_FALLBACK = 1
config_MEM_DECOMP_API           = 0
config_MEM_DECOMP_TO_API        = 0
config_NTSC_COMPATIBILITY       = 1
config_ONLY_1541_AND_COMPATIBLE = 0
config_PREFER_SPEED_OVER_SIZE   = 0
config_UNINSTALL_API            = 0

; status codes
status_OK                       = $00
status_DEVICE_INCOMPATIBLE      = $fb
status_TOO_MANY_DEVICES         = $fc
status_GENERIC_KERNAL_ERROR     = $fd
status_DEVICE_NOT_PRESENT       = $fe
status_FILE_NOT_FOUND           = $ff

; zeropage $e8-$f0
loader_zp_first                 = $e8
loadaddrlo                      = $e8
loadaddrhi                      = $e9
endaddrlo                       = $ea
endaddrhi                       = $eb
loader_zp_last                  = $ef

; install $0c00-$2790
install                         = $0c00

; resident $0400-$0612
loadraw                         = $0400
