import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      }
    })

    const supervisors = [
      {
        email: 'juan.benavides@gibobs.com',
        password: 'Hola2025!',
        nombre: 'Juan Benavides'
      },
      {
        email: 'jaime.aguirre@gibobs.com',
        password: 'Hola2025!',
        nombre: 'Jaime Aguirre'
      }
    ]

    const results = []

    for (const supervisor of supervisors) {
      // Verificar se usuário já existe
      const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
      const userExists = existingUsers?.users?.find(u => u.email === supervisor.email)

      if (userExists) {
        console.log(`Usuario ${supervisor.email} ya existe`)
        
        // Atualizar senha se já existe
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
          userExists.id,
          { password: supervisor.password }
        )

        if (updateError) {
          console.error(`Error actualizando ${supervisor.email}:`, updateError)
          results.push({ 
            email: supervisor.email, 
            status: 'error', 
            message: updateError.message 
          })
        } else {
          results.push({ 
            email: supervisor.email, 
            status: 'updated', 
            message: 'Contraseña actualizada' 
          })
        }
      } else {
        // Criar novo usuário
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email: supervisor.email,
          password: supervisor.password,
          email_confirm: true,
          user_metadata: {
            nombre: supervisor.nombre
          }
        })

        if (createError) {
          console.error(`Error creando ${supervisor.email}:`, createError)
          results.push({ 
            email: supervisor.email, 
            status: 'error', 
            message: createError.message 
          })
        } else {
          console.log(`Usuario ${supervisor.email} creado exitosamente`)
          results.push({ 
            email: supervisor.email, 
            status: 'created', 
            userId: newUser.user?.id 
          })
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        results,
        message: 'Supervisores procesados correctamente'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error: any) {
    console.error('Error general:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})
