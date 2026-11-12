---
title: "Série Apache: do zero ao servidor em produção"
date: 2026-11-11 23:24
author: vinicius
tags: [apache, linux, servidor web]
categories: [tecnologia, serie-apache]
---

## Introdução

Sejam bem-vindos a mais um post! Dessa vez é um pouco diferente: em vez de um assunto fechado, quero anunciar uma **série de posts** sobre um software que roda por trás de uma parte enorme da internet: o **Apache HTTP Server**, ou simplesmente **Apache**.

No [post sobre DNS]({% post_url 2026-11-11-o-que-e-e-como-funciona-o-dns %}), a gente viu como o seu computador descobre o IP de um site a partir do nome dele. Mas e depois? O que acontece quando a sua requisição finalmente chega no servidor? Quem recebe, decide o que responder e devolve a página para o navegador? É exatamente aí que entra o servidor web, e é essa a história que eu quero contar nessa série.

## Por que o Apache?

O Apache existe desde 1995 e, por muito tempo, foi o servidor web mais usado do mundo. Hoje ele divide espaço com alternativas como o Nginx e o Caddy, mas continua firme em hospedagens compartilhadas, servidores de empresas e em muito projeto PHP por aí.

Além disso, ele é um ótimo jeito de aprender como a web funciona por baixo dos panos. Configurar um Apache do zero obriga a entender HTTP, domínios, certificados, permissões de arquivos, logs... Conceitos que valem para qualquer servidor web, não só para ele.

## O que vem por aí

A ideia é que cada post seja curto e focado em um assunto, e que a série vá evoluindo o **mesmo servidor** do começo ao fim: a gente começa com um "Hello World" e termina com um site em HTTPS, seguro e atrás de um proxy reverso.

**Fundamentos**

1. **O que é um servidor web e onde o Apache entra:** um pouco de história, o caminho de uma requisição HTTP e a comparação com Nginx e Caddy.
2. **Instalação e primeiro contato:** instalando no Ubuntu Server, a estrutura de diretórios e os primeiros comandos.
3. **Entendendo a configuração:** diretivas, contextos como `<Directory>` e `<Location>`, e como os arquivos de configuração são organizados.

**Uso prático**

4. **Virtual Hosts:** como hospedar vários sites no mesmo servidor.
5. **HTTPS com Let's Encrypt:** certificado gratuito, redirecionamento de HTTP para HTTPS e renovação automática.
6. **Módulos:** o que são, como habilitar e quais são os mais usados.
7. **`.htaccess` e `mod_rewrite`:** URLs amigáveis, redirecionamentos e por que o `.htaccess` pode deixar o servidor mais lento.
8. **Apache com PHP:** `mod_php` × PHP-FPM e o que muda entre eles.

**Avançado**

9. **Proxy reverso:** colocando o Apache na frente de aplicações em Node, Python ou containers Docker.
10. **Logs e troubleshooting:** como ler os logs e descobrir a causa daquele erro 403 ou 500.
11. **Segurança e hardening:** escondendo informações do servidor, headers de segurança, permissões e o AppArmor.
12. **Performance:** MPMs, cache, compressão e um benchmark simples para medir o resultado.

> A ordem e os temas podem mudar um pouco ao longo do caminho. Conforme os posts forem saindo, vou atualizar a lista acima com os links para cada um.
{: .prompt-info }

## O que você vai precisar

Os exemplos da série vão rodar no **Ubuntu Server** do meu homelab. Para acompanhar na prática, basta ter acesso a uma máquina com Linux: pode ser um servidor em casa, uma máquina virtual ou uma VPS barata. Recomendo o Ubuntu Server (ou o Debian, que é praticamente igual nesse ponto) para seguir os comandos exatamente como eles aparecem nos posts. Quando alguma coisa for muito diferente em outras distros, como no Fedora ou no RHEL, eu deixo uma observação.

Não precisa ser especialista: saber navegar pelo terminal e editar um arquivo de texto já é o suficiente para começar.

## Considerações Finais

O objetivo da série é que, no final, você consiga abrir um arquivo de configuração do Apache e entender o que cada linha faz, em vez de copiar a primeira resposta que aparecer num fórum e torcer para funcionar.

O primeiro post começa exatamente onde o de DNS terminou: o navegador já sabe o IP do servidor e agora precisa conversar com ele. A partir do segundo, já tem mão na massa, então se quiser acompanhar, vale deixar um Ubuntu Server (ou uma VM) separado até lá.

E se tiver algum assunto sobre Apache que não está na lista e você sempre quis entender, deixa nos comentários!
